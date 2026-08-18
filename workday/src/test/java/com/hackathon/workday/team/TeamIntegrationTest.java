package com.hackathon.workday.team;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.support.IntegrationTestBase;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.worker.WorkerType;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class TeamIntegrationTest extends IntegrationTestBase {

	private Organization acme;
	private User david;
	private User sarah;
	private Team backend;
	private Team frontend;

	@BeforeEach
	void setUp() {
		acme = givenOrganization("Acme Corporation", "ACME");
		givenUser(acme, "System Admin", "admin@example.com", Role.SYSTEM_ADMIN);
		david = givenUser(acme, "David Miller", "manager@example.com", Role.MANAGER);
		sarah = givenUser(acme, "Sarah Chen", "manager2@example.com", Role.MANAGER);
		backend = givenTeam(acme, "Backend Engineering", "BACKEND", david);
		frontend = givenTeam(acme, "Frontend Engineering", "FRONTEND", sarah);
	}

	@Test
	@DisplayName("8. an admin can create a team and attach a manager to it")
	void adminCanCreateTeam() throws Exception {
		String adminToken = tokenFor("admin@example.com");

		mockMvc.perform(post("/api/teams")
						.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"name", "Mobile Engineering",
								"code", "MOBILE",
								"description", "iOS and Android",
								"managerId", david.getId()))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.code").value("MOBILE"))
				.andExpect(jsonPath("$.managerId").value(david.getId()))
				.andExpect(jsonPath("$.status").value("ACTIVE"));
	}

	@Test
	@DisplayName("a team cannot be owned by a user who is not a manager")
	void teamManagerMustBeAManager() throws Exception {
		String adminToken = tokenFor("admin@example.com");
		User hr = givenUser(acme, "Anita Sharma", "hr@example.com", Role.HR_MANAGER);

		mockMvc.perform(post("/api/teams")
						.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("name", "Ops", "code", "OPS", "managerId", hr.getId()))))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("FORBIDDEN_OPERATION"));
	}

	@Test
	@DisplayName("a duplicate team code within the organization is rejected")
	void rejectsDuplicateCode() throws Exception {
		String adminToken = tokenFor("admin@example.com");

		mockMvc.perform(post("/api/teams")
						.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("name", "Another Backend", "code", "BACKEND",
								"managerId", david.getId()))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("DUPLICATE_RESOURCE"));
	}

	@Test
	@DisplayName("a manager cannot create teams")
	void managerCannotCreateTeam() throws Exception {
		String managerToken = tokenFor("manager@example.com");

		mockMvc.perform(post("/api/teams")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("name", "Rogue", "code", "ROGUE", "managerId", david.getId()))))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("9. a manager's team listing contains only teams they manage")
	void managerSeesOnlyOwnTeams() throws Exception {
		String managerToken = tokenFor("manager@example.com");

		mockMvc.perform(get("/api/teams")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].code").value("BACKEND"));

		// The admin, by contrast, sees the whole organization.
		String adminToken = tokenFor("admin@example.com");
		mockMvc.perform(get("/api/teams")
						.header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(2));
	}

	@Test
	@DisplayName("10. a manager cannot read another manager's team")
	void managerCannotReadForeignTeam() throws Exception {
		String managerToken = tokenFor("manager@example.com");

		mockMvc.perform(get("/api/teams/" + frontend.getId())
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED_RESOURCE_ACCESS"));

		mockMvc.perform(get("/api/teams/" + backend.getId())
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken)))
				.andExpect(status().isOk());
	}

	@Test
	@DisplayName("11. a worker can view their own team but not another one")
	void workerSeesOnlyOwnTeam() throws Exception {
		givenWorker(acme, "John Carter", "john@example.com", "EMP-1001", WorkerType.CONTRACTOR, backend);
		String johnToken = tokenFor("john@example.com");

		mockMvc.perform(get("/api/teams/" + backend.getId())
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Backend Engineering"));

		mockMvc.perform(get("/api/teams/" + frontend.getId())
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("a team's worker list is scoped the same way as the team itself")
	void teamWorkerListIsScoped() throws Exception {
		givenWorker(acme, "John Carter", "john@example.com", "EMP-1001", WorkerType.CONTRACTOR, backend);
		givenWorker(acme, "Rahul Nair", "rahul@example.com", "EMP-1003", WorkerType.EMPLOYEE, frontend);

		String managerToken = tokenFor("manager@example.com");
		mockMvc.perform(get("/api/teams/" + backend.getId() + "/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].email").value("john@example.com"));

		mockMvc.perform(get("/api/teams/" + frontend.getId() + "/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken)))
				.andExpect(status().isForbidden());
	}
}
