package com.hackathon.workday.assignment;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.support.IntegrationTestBase;
import com.hackathon.workday.team.Team;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.worker.Worker;
import com.hackathon.workday.worker.WorkerStatus;
import com.hackathon.workday.worker.WorkerType;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class AssignmentIntegrationTest extends IntegrationTestBase {

	private Organization acme;
	private User david;
	private User sarah;
	private Team backend;
	private Team frontend;
	private Worker john;
	private Worker rahul;

	@BeforeEach
	void setUp() {
		acme = givenOrganization("Acme Corporation", "ACME");
		givenUser(acme, "System Admin", "admin@example.com", Role.SYSTEM_ADMIN);
		david = givenUser(acme, "David Miller", "manager@example.com", Role.MANAGER);
		sarah = givenUser(acme, "Sarah Chen", "manager2@example.com", Role.MANAGER);
		backend = givenTeam(acme, "Backend Engineering", "BACKEND", david);
		frontend = givenTeam(acme, "Frontend Engineering", "FRONTEND", sarah);
		john = givenWorker(acme, "John Carter", "john@example.com", "EMP-1001", WorkerType.CONTRACTOR, backend);
		rahul = givenWorker(acme, "Rahul Nair", "rahul@example.com", "EMP-1003", WorkerType.EMPLOYEE, frontend);
	}

	private Map<String, Object> payload(Long teamId, Long workerId, String start, String end) {
		Map<String, Object> body = new HashMap<>();
		body.put("teamId", teamId);
		body.put("workerId", workerId);
		body.put("title", "Website Migration");
		body.put("description", "Migrate the legacy site");
		body.put("startDate", start);
		body.put("endDate", end);
		return body;
	}

	@Test
	@DisplayName("12. a manager can assign work to a worker on their own team")
	void managerCanAssignOwnTeamWorker() throws Exception {
		String managerToken = tokenFor("manager@example.com");

		mockMvc.perform(post("/api/assignments")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(payload(backend.getId(), john.getId(), "2026-08-03", "2026-12-31"))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.title").value("Website Migration"))
				.andExpect(jsonPath("$.workerId").value(john.getId()))
				.andExpect(jsonPath("$.status").value("ACTIVE"))
				// The owning manager comes from the token, not the request body.
				.andExpect(jsonPath("$.managerId").value(david.getId()));
	}

	@Test
	@DisplayName("13. a manager cannot assign work to a worker outside their team")
	void managerCannotAssignForeignWorker() throws Exception {
		String managerToken = tokenFor("manager@example.com");

		// Someone else's team entirely.
		mockMvc.perform(post("/api/assignments")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(payload(frontend.getId(), rahul.getId(), "2026-08-03", null))))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED_RESOURCE_ACCESS"));

		// Their own team, but a worker who does not belong to it.
		mockMvc.perform(post("/api/assignments")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(payload(backend.getId(), rahul.getId(), "2026-08-03", null))))
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("INVALID_ASSIGNMENT"));
	}

	@Test
	@DisplayName("14. an inactive worker cannot be assigned")
	void inactiveWorkerCannotBeAssigned() throws Exception {
		john.setStatus(WorkerStatus.INACTIVE);
		workerRepository.save(john);

		String managerToken = tokenFor("manager@example.com");
		mockMvc.perform(post("/api/assignments")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(payload(backend.getId(), john.getId(), "2026-08-03", null))))
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("INVALID_ASSIGNMENT"));
	}

	@Test
	@DisplayName("15. an end date before the start date is rejected")
	void rejectsInvalidDates() throws Exception {
		String managerToken = tokenFor("manager@example.com");

		mockMvc.perform(post("/api/assignments")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(payload(backend.getId(), john.getId(), "2026-08-03", "2026-07-01"))))
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("INVALID_ASSIGNMENT"));
	}

	@Test
	@DisplayName("missing required fields are reported as validation errors")
	void validatesRequiredFields() throws Exception {
		String managerToken = tokenFor("manager@example.com");

		mockMvc.perform(post("/api/assignments")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("teamId", backend.getId()))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
				.andExpect(jsonPath("$.fieldErrors").isNotEmpty());
	}

	@Test
	@DisplayName("a worker sees only their own assignments")
	void workerSeesOnlyOwnAssignments() throws Exception {
		Assignment mine = givenAssignment(backend, john, david, "Website Migration");
		Assignment theirs = givenAssignment(frontend, rahul, sarah, "Design System");

		String johnToken = tokenFor("john@example.com");

		mockMvc.perform(get("/api/assignments/my")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].id").value(mine.getId()));

		mockMvc.perform(get("/api/assignments/" + theirs.getId())
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("a manager can close their own assignment but not another manager's")
	void statusChangeIsOwnershipScoped() throws Exception {
		Assignment mine = givenAssignment(backend, john, david, "Website Migration");
		Assignment theirs = givenAssignment(frontend, rahul, sarah, "Design System");
		String managerToken = tokenFor("manager@example.com");

		mockMvc.perform(patch("/api/assignments/" + mine.getId() + "/status")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("status", "COMPLETED"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("COMPLETED"));

		mockMvc.perform(patch("/api/assignments/" + theirs.getId() + "/status")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("status", "CANCELLED"))))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("a closed assignment cannot change status again")
	void closedAssignmentIsTerminal() throws Exception {
		Assignment assignment = givenAssignment(backend, john, david, "Website Migration");
		String managerToken = tokenFor("manager@example.com");

		mockMvc.perform(patch("/api/assignments/" + assignment.getId() + "/status")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("status", "COMPLETED"))))
				.andExpect(status().isOk());

		mockMvc.perform(patch("/api/assignments/" + assignment.getId() + "/status")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("status", "ACTIVE"))))
				.andExpect(status().is(422));
	}
}
