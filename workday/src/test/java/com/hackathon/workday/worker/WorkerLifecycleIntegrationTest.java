package com.hackathon.workday.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hackathon.workday.assignment.Assignment;
import com.hackathon.workday.contract.Contract;
import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.support.IntegrationTestBase;
import com.hackathon.workday.team.Team;
import com.hackathon.workday.timesheet.Timesheet;
import com.hackathon.workday.timesheet.TimesheetEntry;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class WorkerLifecycleIntegrationTest extends IntegrationTestBase {

	private Organization acme;
	private Team backend;
	private User manager;
	private Contract contract;

	@BeforeEach
	void setUp() {
		acme = givenOrganization("Acme Corporation", "ACME");
		User admin = givenUser(acme, "System Admin", "admin@example.com", Role.SYSTEM_ADMIN);
		givenUser(acme, "Anita Sharma", "hr@example.com", Role.HR_MANAGER);
		manager = givenUser(acme, "David Miller", "manager@example.com", Role.MANAGER);
		backend = givenTeam(acme, "Backend Engineering", "BACKEND", manager);
		contract = givenContract(manager, admin, "Website Migration");
	}

	private Map<String, Object> onboardPayload(String email, String code) {
		Map<String, Object> payload = new HashMap<>();
		payload.put("name", "John Carter");
		payload.put("email", email);
		payload.put("password", PASSWORD);
		payload.put("employeeCode", code);
		payload.put("workerType", "CONTRACTOR");
		payload.put("employmentStartDate", "2026-06-01");
		payload.put("teamId", backend.getId());
		return payload;
	}

	@Test
	@DisplayName("3. an HR manager can onboard a worker")
	void hrCanOnboardWorker() throws Exception {
		String hrToken = tokenFor("hr@example.com");

		mockMvc.perform(post("/api/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(onboardPayload("john@example.com", "EMP-1001"))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.employeeCode").value("EMP-1001"))
				.andExpect(jsonPath("$.workerType").value("CONTRACTOR"))
				.andExpect(jsonPath("$.status").value("ACTIVE"))
				.andExpect(jsonPath("$.teamId").value(backend.getId()));

		// Onboarding creates the login identity as well as the employment record.
		assertThat(userRepository.existsByEmailIgnoreCase("john@example.com")).isTrue();
	}

	@Test
	@DisplayName("4. a manager may not onboard workers; that is HR's responsibility")
	void managerCannotOnboardWorker() throws Exception {
		String managerToken = tokenFor("manager@example.com");

		mockMvc.perform(post("/api/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(onboardPayload("john@example.com", "EMP-1001"))))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("a duplicate email or employee code is rejected")
	void rejectsDuplicates() throws Exception {
		String hrToken = tokenFor("hr@example.com");
		mockMvc.perform(post("/api/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(onboardPayload("john@example.com", "EMP-1001"))))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(onboardPayload("john@example.com", "EMP-9999"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("DUPLICATE_RESOURCE"));

		mockMvc.perform(post("/api/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(onboardPayload("other@example.com", "EMP-1001"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("DUPLICATE_RESOURCE"));
	}

	@Test
	@DisplayName("5. an HR manager can offboard a worker")
	void hrCanOffboardWorker() throws Exception {
		Worker john = givenWorker(acme, "John Carter", "john@example.com",
				"EMP-1001", WorkerType.CONTRACTOR, backend);
		String hrToken = tokenFor("hr@example.com");

		mockMvc.perform(post("/api/workers/" + john.getId() + "/offboard")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("effectiveDate", "2026-08-31", "reason", "Contract ended"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("OFFBOARDED"))
				.andExpect(jsonPath("$.employmentEndDate").value("2026-08-31"));

		// The record is updated in place, never deleted.
		assertThat(workerRepository.findById(john.getId())).isPresent();
	}

	/**
	 * MVP 2: an offboarded worker no longer blocks assignment creation — a
	 * team-owned assignment names no worker at all. What it must still block is
	 * that worker opening any new billable week for themselves.
	 */
	@Test
	@DisplayName("6. an offboarded worker cannot open a new timesheet")
	void offboardedWorkerCannotOpenTimesheet() throws Exception {
		Worker john = givenWorker(acme, "John Carter", "john@example.com",
				"EMP-1001", WorkerType.CONTRACTOR, backend);
		Assignment migration = givenAssignment(backend, contract, manager, "Website Migration");

		String hrToken = tokenFor("hr@example.com");
		mockMvc.perform(post("/api/workers/" + john.getId() + "/offboard")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isOk());

		String johnToken = tokenFor("john@example.com");
		mockMvc.perform(post("/api/timesheets")
						.header(HttpHeaders.AUTHORIZATION, bearer(johnToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of(
								"assignmentId", migration.getId(),
								"weekStartDate", "2026-09-07",
								"entries", List.of()))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("INVALID_TIMESHEET_STATE"));
	}

	@Test
	@DisplayName("7. offboarding preserves the worker's historical timesheets")
	void offboardingPreservesHistory() throws Exception {
		Worker john = givenWorker(acme, "John Carter", "john@example.com",
				"EMP-1001", WorkerType.CONTRACTOR, backend);
		Assignment migration = givenAssignment(backend, contract, manager, "Website Migration");

		Timesheet history = new Timesheet(migration, john, java.time.LocalDate.of(2026, 7, 6));
		history.replaceEntries(List.of(
				new TimesheetEntry(java.time.LocalDate.of(2026, 7, 6), new BigDecimal("8.00"), null),
				new TimesheetEntry(java.time.LocalDate.of(2026, 7, 7), new BigDecimal("7.50"), null)));
		history.submit();
		timesheetRepository.save(history);

		String hrToken = tokenFor("hr@example.com");
		mockMvc.perform(post("/api/workers/" + john.getId() + "/offboard")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isOk());

		// The manager can still read the historical week after offboarding.
		String managerToken = tokenFor("manager@example.com");
		mockMvc.perform(get("/api/timesheets/" + history.getId())
						.header(HttpHeaders.AUTHORIZATION, bearer(managerToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalHours").value(15.50))
				.andExpect(jsonPath("$.status").value("SUBMITTED"));

		assertThat(timesheetRepository.findById(history.getId())).isPresent();
	}

	@Test
	@DisplayName("a worker cannot be offboarded twice")
	void cannotOffboardTwice() throws Exception {
		Worker john = givenWorker(acme, "John Carter", "john@example.com",
				"EMP-1001", WorkerType.CONTRACTOR, backend);
		String hrToken = tokenFor("hr@example.com");

		mockMvc.perform(post("/api/workers/" + john.getId() + "/offboard")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/workers/" + john.getId() + "/offboard")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("INVALID_WORKER_STATE"));
	}

	@Test
	@DisplayName("an end date before the start date is rejected")
	void rejectsEndDateBeforeStart() throws Exception {
		Worker john = givenWorker(acme, "John Carter", "john@example.com",
				"EMP-1001", WorkerType.CONTRACTOR, backend);
		String hrToken = tokenFor("hr@example.com");

		mockMvc.perform(post("/api/workers/" + john.getId() + "/offboard")
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("effectiveDate", "2020-01-01"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("INVALID_WORKER_STATE"));
	}

	@Test
	@DisplayName("HR can update a worker but cannot offboard through PATCH")
	void patchCannotOffboard() throws Exception {
		Worker john = givenWorker(acme, "John Carter", "john@example.com",
				"EMP-1001", WorkerType.CONTRACTOR, backend);
		String hrToken = tokenFor("hr@example.com");

		mockMvc.perform(patch("/api/workers/" + john.getId())
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("workerType", "EMPLOYEE"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.workerType").value("EMPLOYEE"));

		mockMvc.perform(patch("/api/workers/" + john.getId())
						.header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("status", "OFFBOARDED"))))
				.andExpect(status().isConflict());
	}
}
