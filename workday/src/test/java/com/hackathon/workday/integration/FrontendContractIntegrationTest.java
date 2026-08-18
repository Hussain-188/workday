package com.hackathon.workday.integration;

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
 * Covers the endpoints and request shapes the React client depends on: the
 * session check it makes on boot, the manager picker, the dashboard tiles, and
 * the two request bodies where the client legitimately omits a field.
 */
class FrontendContractIntegrationTest extends IntegrationTestBase {

	private Organization acme;
	private User david;
	private Team backend;
	private Worker john;

	@BeforeEach
	void setUp() {
		acme = givenOrganization("Acme Corporation", "ACME");
		givenUser(acme, "System Admin", "admin@example.com", Role.SYSTEM_ADMIN);
		givenUser(acme, "Anita Sharma", "hr@example.com", Role.HR_MANAGER);
		david = givenUser(acme, "David Miller", "manager@example.com", Role.MANAGER);
		givenUser(acme, "Sarah Chen", "manager2@example.com", Role.MANAGER);
		backend = givenTeam(acme, "Backend Engineering", "BACKEND", david);
		john = givenWorker(acme, "John Carter", "john@example.com",
				"EMP-1001", WorkerType.CONTRACTOR, backend);
	}

	@Test
	@DisplayName("GET /api/auth/me returns the caller behind the token")
	void currentUserResolvesFromToken() throws Exception {
		mockMvc.perform(get("/api/auth/me")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("john@example.com"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("john@example.com"))
				.andExpect(jsonPath("$.role").value("WORKER"))
				.andExpect(jsonPath("$.workerId").value(john.getId()));

		// Non-workers have no employment record, so no workerId.
		mockMvc.perform(get("/api/auth/me")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("admin@example.com"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.role").value("SYSTEM_ADMIN"))
				.andExpect(jsonPath("$.workerId").doesNotExist());
	}

	@Test
	@DisplayName("GET /api/auth/me rejects a missing or invalid token")
	void currentUserRequiresValidToken() throws Exception {
		mockMvc.perform(get("/api/auth/me"))
				.andExpect(status().isUnauthorized());

		mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, bearer("garbage")))
				.andExpect(status().isUnauthorized());
	}

	@Test
	@DisplayName("GET /api/users?role=MANAGER backs the team manager picker")
	void listsManagersForPicker() throws Exception {
		mockMvc.perform(get("/api/users").param("role", "MANAGER")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("admin@example.com"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(2))
				.andExpect(jsonPath("$[0].name").value("David Miller"))
				// A password hash must never appear in this projection.
				.andExpect(jsonPath("$[0].passwordHash").doesNotExist());
	}

	@Test
	@DisplayName("the user directory is closed to managers and workers")
	void userDirectoryIsAdminAndHrOnly() throws Exception {
		mockMvc.perform(get("/api/users")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("manager@example.com"))))
				.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/users")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("john@example.com"))))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("dashboard tiles are scoped to the caller's role")
	void dashboardIsRoleScoped() throws Exception {
		mockMvc.perform(get("/api/dashboard/summary")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("admin@example.com"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total_workers").value(1))
				.andExpect(jsonPath("$.teams").value(1));

		mockMvc.perform(get("/api/dashboard/summary")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("manager@example.com"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.my_teams").value(1))
				.andExpect(jsonPath("$.my_workers").value(1))
				// A manager's tiles must not leak organization-wide totals.
				.andExpect(jsonPath("$.total_workers").doesNotExist());

		mockMvc.perform(get("/api/dashboard/summary")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("john@example.com"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.hours_submitted").exists())
				.andExpect(jsonPath("$.my_teams").doesNotExist());
	}

	@Test
	@DisplayName("a manager with no teams sees zeroes, not another manager's data")
	void dashboardDoesNotLeakAcrossManagers() throws Exception {
		mockMvc.perform(get("/api/dashboard/summary")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("manager2@example.com"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.my_teams").value(0))
				.andExpect(jsonPath("$.my_workers").value(0));
	}

	@Test
	@DisplayName("GET /api/timesheets is open to HR, which /api/manager/** is not")
	void organizationTimesheetListIsOpenToHr() throws Exception {
		mockMvc.perform(get("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("hr@example.com"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content").isArray());

		// The manager facade stays admin/manager only.
		mockMvc.perform(get("/api/manager/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("hr@example.com"))))
				.andExpect(status().isForbidden());

		// Workers still have to use /my.
		mockMvc.perform(get("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("john@example.com"))))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("a team can be created without a code; one is derived from the name")
	void teamCodeIsDerivedWhenOmitted() throws Exception {
		mockMvc.perform(post("/api/teams")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("admin@example.com")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"name", "Mobile Engineering",
								"description", "iOS and Android",
								"managerId", david.getId()))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.code").value("MOBILE-ENGINEERING"));

		// A second team with the same name gets a suffix rather than a 409.
		mockMvc.perform(post("/api/teams")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("admin@example.com")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("name", "Mobile Engineering", "managerId", david.getId()))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.code").value("MOBILE-ENGINEERING-2"));
	}

	@Test
	@DisplayName("an assignment can omit teamId; the worker's own team is used")
	void assignmentTeamIsDerivedFromWorker() throws Exception {
		mockMvc.perform(post("/api/assignments")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("manager@example.com")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"workerId", john.getId(),
								"title", "Website Migration",
								"startDate", "2026-08-03"))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.teamId").value(backend.getId()))
				.andExpect(jsonPath("$.managerId").value(david.getId()));
	}

	@Test
	@DisplayName("a derived team is still ownership-checked, not a way around it")
	void derivedTeamStillEnforcesOwnership() throws Exception {
		// Sarah manages no team that John belongs to, so deriving his team must
		// not hand her permission to assign work on it.
		mockMvc.perform(post("/api/assignments")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("manager2@example.com")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"workerId", john.getId(),
								"title", "Sneaky work",
								"startDate", "2026-08-03"))))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED_RESOURCE_ACCESS"));
	}
}
