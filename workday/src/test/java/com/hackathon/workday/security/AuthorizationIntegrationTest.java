package com.hackathon.workday.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.support.IntegrationTestBase;
import com.hackathon.workday.team.Team;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.worker.Worker;
import com.hackathon.workday.worker.WorkerType;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/**
 * Covers the distinction the system depends on: authentication answers "who are
 * you", authorization answers "may you touch this particular record".
 */
class AuthorizationIntegrationTest extends IntegrationTestBase {

	private Organization acme;
	private Organization globex;
	private Team backend;
	private Worker john;

	@BeforeEach
	void setUp() {
		acme = givenOrganization("Acme Corporation", "ACME");
		globex = givenOrganization("Globex", "GLOBEX");

		givenUser(acme, "System Admin", "admin@example.com", Role.SYSTEM_ADMIN);
		givenUser(acme, "Anita Sharma", "hr@example.com", Role.HR_MANAGER);
		User david = givenUser(acme, "David Miller", "manager@example.com", Role.MANAGER);
		backend = givenTeam(acme, "Backend Engineering", "BACKEND", david);
		john = givenWorker(acme, "John Carter", "john@example.com", "EMP-1001", WorkerType.CONTRACTOR, backend);

		// A separate organization, to prove the tenancy boundary holds.
		User outsideManager = givenUser(globex, "Otto Vance", "otto@globex.com", Role.MANAGER);
		givenTeam(globex, "Globex Platform", "GLX-PLAT", outsideManager);
	}

	@Test
	@DisplayName("28. a worker cannot reach admin-only or HR-only endpoints")
	void workerCannotReachPrivilegedEndpoints() throws Exception {
		String johnToken = tokenFor("john@example.com");

		mockMvc.perform(post("/api/teams")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("name", "X", "code", "X", "managerId", 1))))
				.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/hr/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/manager/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("28b. an HR manager cannot create assignments; that is a manager's job")
	void hrCannotCreateAssignments() throws Exception {
		String hrToken = tokenFor("hr@example.com");

		mockMvc.perform(post("/api/assignments")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"teamId", backend.getId(),
								"workerId", john.getId(),
								"title", "Unauthorised work",
								"startDate", "2026-08-03"))))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("29. a worker reading their own record succeeds; reading another's does not")
	void resourceLevelAuthorizationIsEnforced() throws Exception {
		Worker rahul = givenWorker(acme, "Rahul Nair", "rahul@example.com",
				"EMP-1003", WorkerType.EMPLOYEE, backend);
		String johnToken = tokenFor("john@example.com");

		mockMvc.perform(get("/api/workers/" + john.getId())
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("john@example.com"));

		mockMvc.perform(get("/api/workers/" + rahul.getId())
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED_RESOURCE_ACCESS"));
	}

	@Test
	@DisplayName("29b. /me resolves the caller from the token, not from a parameter")
	void ownProfileComesFromTheToken() throws Exception {
		String johnToken = tokenFor("john@example.com");

		// The bogus workerId query parameter must have no effect whatsoever.
		mockMvc.perform(get("/api/workers/me")
						.param("workerId", "999999")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(john.getId()))
				.andExpect(jsonPath("$.email").value("john@example.com"));
	}

	@Test
	@DisplayName("an admin cannot reach across the organization boundary")
	void organizationBoundaryHolds() throws Exception {
		givenUser(globex, "Globex Admin", "admin@globex.com", Role.SYSTEM_ADMIN);
		String globexToken = tokenFor("admin@globex.com");

		// Acme's worker is invisible to Globex's admin, despite the same role.
		mockMvc.perform(get("/api/workers/" + john.getId())
						.header(HttpHeaders.AUTHORIZATION, bearer(globexToken)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED_RESOURCE_ACCESS"));

		mockMvc.perform(get("/api/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(globexToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(0));
	}

	@Test
	@DisplayName("a manager listing workers sees only their own team's workers")
	void managerListingIsScopedByQuery() throws Exception {
		User sarah = givenUser(acme, "Sarah Chen", "manager2@example.com", Role.MANAGER);
		Team frontend = givenTeam(acme, "Frontend Engineering", "FRONTEND", sarah);
		givenWorker(acme, "Rahul Nair", "rahul@example.com", "EMP-1003", WorkerType.EMPLOYEE, frontend);

		mockMvc.perform(get("/api/manager/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("manager@example.com"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].email").value("john@example.com"));

		mockMvc.perform(get("/api/manager/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("manager2@example.com"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].email").value("rahul@example.com"));
	}
}
