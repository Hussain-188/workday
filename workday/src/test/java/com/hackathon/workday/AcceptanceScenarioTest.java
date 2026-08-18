package com.hackathon.workday;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hackathon.workday.common.audit.AuditAction;
import com.hackathon.workday.common.audit.AuditLog;
import com.hackathon.workday.common.audit.AuditLogRepository;
import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.support.IntegrationTestBase;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/**
 * The MVP 1 acceptance walkthrough, driven entirely over HTTP in the order a
 * real user would perform it: onboard, staff a team, assign work, record a
 * week, submit it, then offboard and prove the history survives.
 */
class AcceptanceScenarioTest extends IntegrationTestBase {

	@Autowired
	private AuditLogRepository auditLogRepository;

	private Organization acme;
	private User david;

	@BeforeEach
	void setUp() {
		acme = givenOrganization("Acme Corporation", "ACME");
		givenUser(acme, "System Admin", "admin@example.com", Role.SYSTEM_ADMIN);
		givenUser(acme, "Anita Sharma", "hr@example.com", Role.HR_MANAGER);
		david = givenUser(acme, "David Miller", "manager@example.com", Role.MANAGER);
	}

	@Test
	@DisplayName("the full MVP 1 workflow, end to end")
	void fullWorkflow() throws Exception {
		// STEP 1 — the system admin logs in.
		String adminToken = tokenFor("admin@example.com");

		// STEP 4 — the admin creates Backend Engineering, managed by David.
		String teamJson = mockMvc.perform(post("/api/teams")
						.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"name", "Backend Engineering",
								"code", "BACKEND",
								"description", "Server-side platform team",
								"managerId", david.getId()))))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		long teamId = ((Number) objectMapper.readValue(teamJson, Map.class).get("id")).longValue();

		// STEPS 2, 3 & 5 — HR onboards John as a CONTRACTOR onto that team,
		// active from the moment he is created.
		String hrToken = tokenFor("hr@example.com");
		Map<String, Object> onboarding = new HashMap<>();
		onboarding.put("name", "John Carter");
		onboarding.put("email", "john@example.com");
		onboarding.put("password", PASSWORD);
		onboarding.put("employeeCode", "EMP-1001");
		onboarding.put("workerType", "CONTRACTOR");
		onboarding.put("employmentStartDate", "2026-06-01");
		onboarding.put("teamId", teamId);

		String workerJson = mockMvc.perform(post("/api/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(onboarding)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("ACTIVE"))
				.andExpect(jsonPath("$.workerType").value("CONTRACTOR"))
				.andReturn().getResponse().getContentAsString();
		long johnWorkerId = ((Number) objectMapper.readValue(workerJson, Map.class).get("id")).longValue();

		// STEP 6 — David logs in and sees his team and the workers on it.
		String davidToken = tokenFor("manager@example.com");
		mockMvc.perform(get("/api/manager/teams")
						.header(HttpHeaders.AUTHORIZATION, bearer(davidToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].name").value("Backend Engineering"));

		mockMvc.perform(get("/api/manager/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(davidToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].name").value("John Carter"));

		// STEP 7 — David assigns John to the Website Migration project.
		String assignmentJson = mockMvc.perform(post("/api/assignments")
						.header(HttpHeaders.AUTHORIZATION, bearer(davidToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"teamId", teamId,
								"workerId", johnWorkerId,
								"title", "Website Migration",
								"description", "Migrate the legacy marketing site",
								"startDate", "2026-08-03"))))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		long assignmentId = ((Number) objectMapper.readValue(assignmentJson, Map.class).get("id")).longValue();

		// STEP 8 — John logs in and sees his own team and assignment.
		String johnToken = tokenFor("john@example.com");
		mockMvc.perform(get("/api/workers/me")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.teamName").value("Backend Engineering"));

		mockMvc.perform(get("/api/assignments/my")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].title").value("Website Migration"));

		// STEPS 9 & 10 — John records the week of 2026-08-17 and saves it as a
		// draft. The server derives 39.5 hours from the daily entries.
		String timesheetJson = mockMvc.perform(post("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"assignmentId", assignmentId,
								"weekStartDate", "2026-08-17",
								"entries", List.of(
										Map.of("workDate", "2026-08-17", "hours", 8),
										Map.of("workDate", "2026-08-18", "hours", 8),
										Map.of("workDate", "2026-08-19", "hours", 7.5),
										Map.of("workDate", "2026-08-20", "hours", 8),
										Map.of("workDate", "2026-08-21", "hours", 8),
										Map.of("workDate", "2026-08-22", "hours", 0),
										Map.of("workDate", "2026-08-23", "hours", 0))))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("DRAFT"))
				.andExpect(jsonPath("$.totalHours").value(39.50))
				.andReturn().getResponse().getContentAsString();
		long timesheetId = ((Number) objectMapper.readValue(timesheetJson, Map.class).get("id")).longValue();

		// STEP 11 — John edits the draft, then puts it back as it was.
		mockMvc.perform(put("/api/timesheets/" + timesheetId + "/entries")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("entries", List.of(
								Map.of("workDate", "2026-08-17", "hours", 8),
								Map.of("workDate", "2026-08-18", "hours", 8),
								Map.of("workDate", "2026-08-19", "hours", 6),
								Map.of("workDate", "2026-08-20", "hours", 8),
								Map.of("workDate", "2026-08-21", "hours", 8))))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalHours").value(38.00));

		mockMvc.perform(put("/api/timesheets/" + timesheetId + "/entries")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("entries", List.of(
								Map.of("workDate", "2026-08-17", "hours", 8),
								Map.of("workDate", "2026-08-18", "hours", 8),
								Map.of("workDate", "2026-08-19", "hours", 7.5),
								Map.of("workDate", "2026-08-20", "hours", 8),
								Map.of("workDate", "2026-08-21", "hours", 8))))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalHours").value(39.50));

		// STEP 12 — John submits the week.
		mockMvc.perform(post("/api/timesheets/" + timesheetId + "/submit")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("SUBMITTED"))
				.andExpect(jsonPath("$.totalHours").value(39.50));

		// STEP 13 — a further edit is refused.
		mockMvc.perform(put("/api/timesheets/" + timesheetId + "/entries")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("entries", List.of(
								Map.of("workDate", "2026-08-17", "hours", 1))))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("INVALID_TIMESHEET_STATE"));

		// STEP 14 — David reads John's submitted week and sees 39.5 hours.
		mockMvc.perform(get("/api/manager/timesheets/" + timesheetId)
						.header(HttpHeaders.AUTHORIZATION, bearer(davidToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.workerName").value("John Carter"))
				.andExpect(jsonPath("$.totalHours").value(39.50))
				.andExpect(jsonPath("$.status").value("SUBMITTED"));

		// STEP 15 — HR offboards John.
		mockMvc.perform(post("/api/workers/" + johnWorkerId + "/offboard")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("effectiveDate", "2026-08-31", "reason", "Contract ended"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("OFFBOARDED"));

		// STEP 16 — the historical timesheet is still readable by both parties.
		mockMvc.perform(get("/api/manager/timesheets/" + timesheetId)
						.header(HttpHeaders.AUTHORIZATION, bearer(davidToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalHours").value(39.50));

		mockMvc.perform(get("/api/timesheets/my")
						.header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("john@example.com"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].totalHours").value(39.50));

		// STEP 17 — new work for an offboarded worker is refused.
		mockMvc.perform(post("/api/assignments")
						.header(HttpHeaders.AUTHORIZATION, bearer(davidToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"teamId", teamId,
								"workerId", johnWorkerId,
								"title", "Follow-up work",
								"startDate", "2026-09-01"))))
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("INVALID_ASSIGNMENT"));

		// The lifecycle left a readable audit trail behind it.
		List<AuditAction> actions = auditLogRepository.findAll().stream()
				.map(AuditLog::getAction)
				.toList();
		assertThat(actions).contains(
				AuditAction.TEAM_CREATED,
				AuditAction.WORKER_ONBOARDED,
				AuditAction.ASSIGNMENT_CREATED,
				AuditAction.TIMESHEET_CREATED,
				AuditAction.TIMESHEET_SUBMITTED,
				AuditAction.WORKER_OFFBOARDED);
	}
}
