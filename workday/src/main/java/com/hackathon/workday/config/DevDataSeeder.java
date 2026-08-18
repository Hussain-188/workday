package com.hackathon.workday.config;

import com.hackathon.workday.assignment.Assignment;
import com.hackathon.workday.assignment.AssignmentRepository;
import com.hackathon.workday.contract.Contract;
import com.hackathon.workday.contract.ContractRepository;
import com.hackathon.workday.invoice.Invoice;
import com.hackathon.workday.invoice.InvoiceRepository;
import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.organization.OrganizationRepository;
import com.hackathon.workday.team.Team;
import com.hackathon.workday.team.TeamRepository;
import com.hackathon.workday.timesheet.Timesheet;
import com.hackathon.workday.timesheet.TimesheetEntry;
import com.hackathon.workday.timesheet.TimesheetRepository;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.user.UserRepository;
import com.hackathon.workday.worker.Worker;
import com.hackathon.workday.worker.WorkerRepository;
import com.hackathon.workday.worker.WorkerType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Demo data for local development, active only under the {@code dev} profile.
 *
 * <p>Idempotent: it does nothing if the Acme organization already exists, so
 * restarting the app never duplicates rows. All accounts share the password
 * {@code Password123!} — see docs/local-setup.md.
 */
@Component
@Profile("dev")
public class DevDataSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

	private static final String ORGANIZATION_CODE = "ACME";
	private static final String DEFAULT_PASSWORD = "Password123!";

	private final OrganizationRepository organizationRepository;
	private final UserRepository userRepository;
	private final WorkerRepository workerRepository;
	private final TeamRepository teamRepository;
	private final AssignmentRepository assignmentRepository;
	private final TimesheetRepository timesheetRepository;
	private final ContractRepository contractRepository;
	private final InvoiceRepository invoiceRepository;
	private final PasswordEncoder passwordEncoder;

	public DevDataSeeder(OrganizationRepository organizationRepository, UserRepository userRepository,
			WorkerRepository workerRepository, TeamRepository teamRepository,
			AssignmentRepository assignmentRepository, TimesheetRepository timesheetRepository,
			ContractRepository contractRepository, InvoiceRepository invoiceRepository,
			PasswordEncoder passwordEncoder) {
		this.organizationRepository = organizationRepository;
		this.userRepository = userRepository;
		this.workerRepository = workerRepository;
		this.teamRepository = teamRepository;
		this.assignmentRepository = assignmentRepository;
		this.timesheetRepository = timesheetRepository;
		this.contractRepository = contractRepository;
		this.invoiceRepository = invoiceRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (organizationRepository.existsByCode(ORGANIZATION_CODE)) {
			log.info("Development seed data already present; skipping");
			return;
		}

		Organization acme = organizationRepository.save(new Organization("Acme Corporation", ORGANIZATION_CODE));

		User systemAdmin = createUser(acme, "System Admin", "admin@example.com", Role.SYSTEM_ADMIN);
		createUser(acme, "Anita Sharma", "hr@example.com", Role.HR_MANAGER);
		// Named David so the acceptance walkthrough reads as written; distinct
		// from the worker David Kumar below, who is a different person.
		User davidMiller = createUser(acme, "David Miller", "manager@example.com", Role.MANAGER);
		User sarahChen = createUser(acme, "Sarah Chen", "manager2@example.com", Role.MANAGER);
		User priyaMenon = createUser(acme, "Priya Menon", "pm@example.com", Role.PROJECT_MANAGER);

		Team backend = teamRepository.save(new Team(
				acme, "Backend Engineering", "BACKEND", "Server-side platform team", davidMiller));
		Team frontend = teamRepository.save(new Team(
				acme, "Frontend Engineering", "FRONTEND", "Web client team", sarahChen));

		Worker john = createWorker(acme, "John Carter", "john@example.com",
				"EMP-1001", WorkerType.CONTRACTOR, LocalDate.of(2026, 6, 1), backend);
		Worker davidKumar = createWorker(acme, "David Kumar", "david@example.com",
				"EMP-1002", WorkerType.EMPLOYEE, LocalDate.of(2025, 11, 17), backend);
		Worker rahul = createWorker(acme, "Rahul Nair", "rahul@example.com",
				"EMP-1003", WorkerType.EMPLOYEE, LocalDate.of(2026, 2, 2), frontend);

		Assignment migration = assignmentRepository.save(new Assignment(
				backend, john, davidMiller, "Website Migration",
				"Migrate the legacy marketing site onto the new platform",
				LocalDate.of(2026, 6, 1), null));
		assignmentRepository.save(new Assignment(
				backend, davidKumar, davidMiller, "Payments API",
				"Build and harden the payments integration",
				LocalDate.of(2026, 1, 5), null));
		assignmentRepository.save(new Assignment(
				frontend, rahul, sarahChen, "Design System Rollout",
				"Roll the shared component library out across the app",
				LocalDate.of(2026, 3, 2), null));

		// One completed historical week for John. The week of 2026-08-17 is left
		// free on purpose so the acceptance walkthrough can create it.
		seedSubmittedWeek(migration, LocalDate.of(2026, 8, 10));

		Contract websiteMigrationContract = contractRepository.save(new Contract(
				"Website Migration", LocalDate.of(2026, 6, 1), 6, davidMiller, systemAdmin));

		// A submitted invoice sitting in Priya's approval queue, plus a second one
		// already decided, so the walkthrough can exercise both list filters.
		Invoice pendingInvoice = new Invoice(
				websiteMigrationContract, davidMiller, priyaMenon,
				LocalDate.of(2026, 8, 3), LocalDate.of(2026, 8, 9),
				new BigDecimal("6400.00"), "August week 1 hours, verified against timesheets");
		pendingInvoice.submit();
		invoiceRepository.save(pendingInvoice);

		Invoice approvedInvoice = new Invoice(
				websiteMigrationContract, davidMiller, priyaMenon,
				LocalDate.of(2026, 7, 27), LocalDate.of(2026, 8, 2),
				new BigDecimal("6400.00"), "July week 5 hours, verified against timesheets");
		approvedInvoice.submit();
		approvedInvoice.approve("Looks good, approved for payment");
		invoiceRepository.save(approvedInvoice);

		log.info("Seeded development data for {} (all accounts use password {})",
				acme.getName(), DEFAULT_PASSWORD);
	}

	private User createUser(Organization organization, String name, String email, Role role) {
		return userRepository.save(new User(
				organization, name, email, passwordEncoder.encode(DEFAULT_PASSWORD), role));
	}

	private Worker createWorker(Organization organization, String name, String email, String employeeCode,
			WorkerType type, LocalDate startDate, Team team) {
		User user = createUser(organization, name, email, Role.WORKER);
		Worker worker = new Worker(user, organization, employeeCode, type, startDate);
		worker.setTeam(team);
		return workerRepository.save(worker);
	}

	/** A full Monday-to-Friday week at 8 hours a day, already submitted. */
	private void seedSubmittedWeek(Assignment assignment, LocalDate weekStart) {
		Timesheet timesheet = new Timesheet(assignment, weekStart);
		timesheet.replaceEntries(List.of(
				new TimesheetEntry(weekStart, new BigDecimal("8.00"), "Content audit"),
				new TimesheetEntry(weekStart.plusDays(1), new BigDecimal("8.00"), "Template porting"),
				new TimesheetEntry(weekStart.plusDays(2), new BigDecimal("8.00"), "Template porting"),
				new TimesheetEntry(weekStart.plusDays(3), new BigDecimal("8.00"), "Redirect mapping"),
				new TimesheetEntry(weekStart.plusDays(4), new BigDecimal("8.00"), "QA and handover")));
		timesheet.submit();
		timesheetRepository.save(timesheet);
	}
}
