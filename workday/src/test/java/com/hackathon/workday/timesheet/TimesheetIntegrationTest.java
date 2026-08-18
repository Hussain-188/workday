package com.hackathon.workday.timesheet;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hackathon.workday.assignment.Assignment;
import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.support.IntegrationTestBase;
import com.hackathon.workday.team.Team;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.worker.Worker;
import com.hackathon.workday.worker.WorkerType;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class TimesheetIntegrationTest extends IntegrationTestBase {

	/** 2026-08-17 is a Monday. */
	private static final String WEEK_START = "2026-08-17";

	private Organization acme;
	private User david;
	private User sarah;
	private Team backend;
	private Team frontend;
	private Worker john;
	private Worker rahul;
	private Assignment migration;
	private Assignment designSystem;

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
		migration = givenAssignment(backend, john, david, "Website Migration");
		designSystem = givenAssignment(frontend, rahul, sarah, "Design System Rollout");
	}

	private List<Map<String, Object>> fullWeek() {
		return List.of(
				Map.of("workDate", "2026-08-17", "hours", 8),
				Map.of("workDate", "2026-08-18", "hours", 8),
				Map.of("workDate", "2026-08-19", "hours", 7.5),
				Map.of("workDate", "2026-08-20", "hours", 8),
				Map.of("workDate", "2026-08-21", "hours", 8),
				Map.of("workDate", "2026-08-22", "hours", 0),
				Map.of("workDate", "2026-08-23", "hours", 0));
	}

	private long createTimesheet(String token, Long assignmentId, Object entries) throws Exception {
		String response = mockMvc.perform(post("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(token))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"assignmentId", assignmentId,
								"weekStartDate", WEEK_START,
								"entries", entries))))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		return ((Number) objectMapper.readValue(response, Map.class).get("id")).longValue();
	}

	@Test
	@DisplayName("16 & 23. a worker creates a timesheet and the server totals the hours")
	void workerCreatesTimesheetAndServerTotals() throws Exception {
		String johnToken = tokenFor("john@example.com");

		mockMvc.perform(post("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"assignmentId", migration.getId(),
								"weekStartDate", WEEK_START,
								"entries", fullWeek()))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("DRAFT"))
				.andExpect(jsonPath("$.weekStartDate").value("2026-08-17"))
				.andExpect(jsonPath("$.weekEndDate").value("2026-08-23"))
				.andExpect(jsonPath("$.totalHours").value(39.50))
				.andExpect(jsonPath("$.entries.length()").value(7));
	}

	@Test
	@DisplayName("23b. a client-supplied total is ignored; the server recalculates")
	void ignoresClientSuppliedTotal() throws Exception {
		String johnToken = tokenFor("john@example.com");

		mockMvc.perform(post("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"assignmentId", migration.getId(),
								"weekStartDate", WEEK_START,
								"totalHours", 999,
								"entries", List.of(Map.of("workDate", "2026-08-17", "hours", 8))))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.totalHours").value(8.00));
	}

	@Test
	@DisplayName("17. a worker cannot open a timesheet against someone else's assignment")
	void cannotCreateForAnotherWorkersAssignment() throws Exception {
		String johnToken = tokenFor("john@example.com");

		mockMvc.perform(post("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"assignmentId", designSystem.getId(),
								"weekStartDate", WEEK_START,
								"entries", List.of()))))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED_RESOURCE_ACCESS"));
	}

	@Test
	@DisplayName("18. a second timesheet for the same assignment and week is rejected")
	void rejectsDuplicateWeek() throws Exception {
		String johnToken = tokenFor("john@example.com");
		createTimesheet(johnToken, migration.getId(), fullWeek());

		mockMvc.perform(post("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"assignmentId", migration.getId(),
								"weekStartDate", WEEK_START,
								"entries", List.of()))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("DUPLICATE_TIMESHEET"));
	}

	@Test
	@DisplayName("19. a draft can be edited and the total follows the change")
	void draftCanBeEdited() throws Exception {
		String johnToken = tokenFor("john@example.com");
		long id = createTimesheet(johnToken, migration.getId(), fullWeek());

		mockMvc.perform(put("/api/timesheets/" + id + "/entries")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("entries", List.of(
								Map.of("workDate", "2026-08-17", "hours", 6),
								Map.of("workDate", "2026-08-18", "hours", 6.25))))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalHours").value(12.25))
				.andExpect(jsonPath("$.entries.length()").value(2))
				.andExpect(jsonPath("$.status").value("DRAFT"));
	}

	@Test
	@DisplayName("20. a submitted timesheet can no longer be edited")
	void submittedCannotBeEdited() throws Exception {
		String johnToken = tokenFor("john@example.com");
		long id = createTimesheet(johnToken, migration.getId(), fullWeek());

		mockMvc.perform(post("/api/timesheets/" + id + "/submit")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("SUBMITTED"))
				.andExpect(jsonPath("$.totalHours").value(39.50));

		mockMvc.perform(put("/api/timesheets/" + id + "/entries")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("entries", List.of(
								Map.of("workDate", "2026-08-17", "hours", 1))))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("INVALID_TIMESHEET_STATE"));

		mockMvc.perform(post("/api/timesheets/" + id + "/submit")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isConflict());
	}

	@Test
	@DisplayName("21. hours outside 0 to 24 are rejected")
	void rejectsInvalidHours() throws Exception {
		String johnToken = tokenFor("john@example.com");

		mockMvc.perform(post("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"assignmentId", migration.getId(),
								"weekStartDate", WEEK_START,
								"entries", List.of(Map.of("workDate", "2026-08-17", "hours", 25))))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

		mockMvc.perform(post("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"assignmentId", migration.getId(),
								"weekStartDate", WEEK_START,
								"entries", List.of(Map.of("workDate", "2026-08-17", "hours", -1))))))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("22. a work date outside the week is rejected")
	void rejectsWorkDateOutsideWeek() throws Exception {
		String johnToken = tokenFor("john@example.com");

		mockMvc.perform(post("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"assignmentId", migration.getId(),
								"weekStartDate", WEEK_START,
								"entries", List.of(Map.of("workDate", "2026-08-25", "hours", 8))))))
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("INVALID_TIMESHEET_ENTRY"));
	}

	@Test
	@DisplayName("22b. a week that does not start on a Monday is rejected")
	void rejectsNonMondayWeek() throws Exception {
		String johnToken = tokenFor("john@example.com");

		mockMvc.perform(post("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"assignmentId", migration.getId(),
								"weekStartDate", "2026-08-18",
								"entries", List.of()))))
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.code").value("INVALID_TIMESHEET_ENTRY"));
	}

	@Test
	@DisplayName("24. a worker can read back their own timesheet history")
	void workerReadsOwnHistory() throws Exception {
		String johnToken = tokenFor("john@example.com");
		long id = createTimesheet(johnToken, migration.getId(), fullWeek());

		mockMvc.perform(get("/api/timesheets/my")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].id").value(id))
				.andExpect(jsonPath("$.content[0].totalHours").value(39.50));
	}

	@Test
	@DisplayName("25. a manager can read the timesheets of their own team")
	void managerReadsTeamTimesheets() throws Exception {
		String johnToken = tokenFor("john@example.com");
		long id = createTimesheet(johnToken, migration.getId(), fullWeek());
		mockMvc.perform(post("/api/timesheets/" + id + "/submit")
				.header(HttpHeaders.AUTHORIZATION, bearer(johnToken)));

		String managerToken = tokenFor("manager@example.com");

		mockMvc.perform(get("/api/manager/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].workerName").value("John Carter"))
				.andExpect(jsonPath("$.content[0].totalHours").value(39.50));

		mockMvc.perform(get("/api/manager/timesheets/" + id)
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalHours").value(39.50));
	}

	@Test
	@DisplayName("26. a manager cannot read a timesheet from a team they do not manage")
	void managerCannotReadForeignTimesheet() throws Exception {
		String johnToken = tokenFor("john@example.com");
		long id = createTimesheet(johnToken, migration.getId(), fullWeek());

		// Sarah manages Frontend, not Backend.
		String sarahToken = tokenFor("manager2@example.com");

		mockMvc.perform(get("/api/timesheets/" + id)
						.header(HttpHeaders.AUTHORIZATION, bearer(sarahToken)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED_RESOURCE_ACCESS"));

		mockMvc.perform(get("/api/manager/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(sarahToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(0));
	}

	@Test
	@DisplayName("a worker cannot read another worker's timesheet")
	void workerCannotReadAnotherWorkersTimesheet() throws Exception {
		String johnToken = tokenFor("john@example.com");
		long id = createTimesheet(johnToken, migration.getId(), fullWeek());

		String rahulToken = tokenFor("rahul@example.com");
		mockMvc.perform(get("/api/timesheets/" + id)
						.header(HttpHeaders.AUTHORIZATION, bearer(rahulToken)))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("a worker cannot edit a draft belonging to another worker")
	void workerCannotEditAnotherWorkersDraft() throws Exception {
		String johnToken = tokenFor("john@example.com");
		long id = createTimesheet(johnToken, migration.getId(), fullWeek());

		String rahulToken = tokenFor("rahul@example.com");
		mockMvc.perform(put("/api/timesheets/" + id + "/entries")
						.header(HttpHeaders.AUTHORIZATION, bearer(rahulToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("entries", List.of(
								Map.of("workDate", "2026-08-17", "hours", 1))))))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("no timesheet can be opened against a closed assignment")
	void cannotOpenWeekOnClosedAssignment() throws Exception {
		migration.setStatus(com.hackathon.workday.assignment.AssignmentStatus.COMPLETED);
		assignmentRepository.save(migration);

		String johnToken = tokenFor("john@example.com");
		mockMvc.perform(post("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"assignmentId", migration.getId(),
								"weekStartDate", WEEK_START,
								"entries", List.of()))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("INVALID_TIMESHEET_STATE"));
	}
}
