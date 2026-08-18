package com.hackathon.workday.support;

import com.hackathon.workday.assignment.Assignment;
import com.hackathon.workday.assignment.AssignmentRepository;
import com.hackathon.workday.contract.Contract;
import com.hackathon.workday.contract.ContractRepository;
import com.hackathon.workday.invoice.InvoiceRepository;
import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.organization.OrganizationRepository;
import com.hackathon.workday.team.Team;
import com.hackathon.workday.team.TeamRepository;
import com.hackathon.workday.timesheet.TimesheetRepository;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.user.UserRepository;
import com.hackathon.workday.worker.Worker;
import com.hackathon.workday.worker.WorkerRepository;
import com.hackathon.workday.worker.WorkerType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/**
 * Shared harness for the HTTP-level tests. Each test starts from an empty
 * schema and builds exactly the fixtures it needs, so no test depends on
 * another's leftovers or on the dev seed data.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestBase {

	protected static final String PASSWORD = "Password123!";

	@Autowired
	protected MockMvc mockMvc;

	@Autowired
	protected ObjectMapper objectMapper;

	@Autowired
	protected OrganizationRepository organizationRepository;

	@Autowired
	protected UserRepository userRepository;

	@Autowired
	protected WorkerRepository workerRepository;

	@Autowired
	protected TeamRepository teamRepository;

	@Autowired
	protected ContractRepository contractRepository;

	@Autowired
	protected AssignmentRepository assignmentRepository;

	@Autowired
	protected TimesheetRepository timesheetRepository;

	@Autowired
	protected InvoiceRepository invoiceRepository;

	@Autowired
	protected PasswordEncoder passwordEncoder;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	/**
	 * Truncating is faster than a delete cascade and resets AUTO_INCREMENT, so
	 * ids are predictable per test. Foreign key checks are lifted only for the
	 * duration of the wipe.
	 */
	@BeforeEach
	void resetDatabase() {
		jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 0");
		for (String table : new String[] {
				"timesheet_entries", "timesheets", "invoices", "assignments", "contracts",
				"audit_logs", "workers", "teams", "users", "organizations" }) {
			jdbcTemplate.execute("TRUNCATE TABLE " + table);
		}
		jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 1");
	}

	// ------------------------------------------------------------- fixtures

	protected Organization givenOrganization(String name, String code) {
		return organizationRepository.save(new Organization(name, code));
	}

	protected User givenUser(Organization organization, String name, String email, Role role) {
		return userRepository.save(new User(
				organization, name, email, passwordEncoder.encode(PASSWORD), role));
	}

	protected Team givenTeam(Organization organization, String name, String code, User manager) {
		return teamRepository.save(new Team(organization, name, code, null, manager));
	}

	protected Worker givenWorker(Organization organization, String name, String email,
			String employeeCode, WorkerType type, Team team) {
		return givenWorker(organization, name, email, employeeCode, type, team, BigDecimal.ZERO);
	}

	protected Worker givenWorker(Organization organization, String name, String email,
			String employeeCode, WorkerType type, Team team, BigDecimal hourlyRate) {
		User user = givenUser(organization, name, email, Role.WORKER);
		Worker worker = new Worker(user, organization, employeeCode, type, LocalDate.of(2026, 1, 5), hourlyRate);
		worker.setTeam(team);
		return workerRepository.save(worker);
	}

	/** The project a Team Assignment bills against. */
	protected Contract givenContract(User manager, User createdByAdmin, String projectName) {
		return contractRepository.save(
				new Contract(projectName, LocalDate.of(2026, 1, 5), 12, manager, createdByAdmin));
	}

	/** MVP 2: an assignment is owned by a team, not a single worker. */
	protected Assignment givenAssignment(Team team, Contract contract, User manager, String title) {
		return assignmentRepository.save(new Assignment(
				team, contract, manager, title, null, LocalDate.of(2026, 1, 5), null));
	}

	// --------------------------------------------------------------- helpers

	/**
	 * Logs in over HTTP and returns the access token. Tests authenticate the
	 * same way the React client will, rather than stubbing the security context.
	 */
	@SuppressWarnings("unchecked")
	protected String tokenFor(String email) throws Exception {
		String body = objectMapper.writeValueAsString(Map.of("email", email, "password", PASSWORD));
		String response = mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(body))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsString();
		return (String) objectMapper.readValue(response, Map.class).get("accessToken");
	}

	protected String bearer(String token) {
		return "Bearer " + token;
	}

	protected String json(Object value) {
		return objectMapper.writeValueAsString(value);
	}
}
