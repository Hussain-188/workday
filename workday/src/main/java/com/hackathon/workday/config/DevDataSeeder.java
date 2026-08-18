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
import com.hackathon.workday.worker.WorkerStatus;
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
 *
 * <p>Deliberately larger than a minimal smoke-test fixture: one admin, two HR
 * managers, four managers (one per team), two project managers, and twelve
 * workers spread across four teams — enough variety that every screen, every
 * role, and every worker lifecycle state (active, inactive, offboarded) has
 * something real to show. See docs/MVP1.md and docs/MVP2.md for the guided
 * walkthroughs this data is built to support.
 */
@Component
@Profile("dev")
public class DevDataSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

	private static final String ORGANIZATION_CODE = "ACME";
	private static final String DEFAULT_PASSWORD = "Password123!";
	/** 2026-08-10 and 2026-08-17 are both Mondays; Timesheet requires one. */
	private static final LocalDate BILLABLE_WEEK = LocalDate.of(2026, 8, 10);

	private final OrganizationRepository organizationRepository;
	private final UserRepository userRepository;
	private final WorkerRepository workerRepository;
	private final TeamRepository teamRepository;
	private final ContractRepository contractRepository;
	private final AssignmentRepository assignmentRepository;
	private final TimesheetRepository timesheetRepository;
	private final InvoiceRepository invoiceRepository;
	private final PasswordEncoder passwordEncoder;

	public DevDataSeeder(OrganizationRepository organizationRepository, UserRepository userRepository,
			WorkerRepository workerRepository, TeamRepository teamRepository, ContractRepository contractRepository,
			AssignmentRepository assignmentRepository, TimesheetRepository timesheetRepository,
			InvoiceRepository invoiceRepository, PasswordEncoder passwordEncoder) {
		this.organizationRepository = organizationRepository;
		this.userRepository = userRepository;
		this.workerRepository = workerRepository;
		this.teamRepository = teamRepository;
		this.contractRepository = contractRepository;
		this.assignmentRepository = assignmentRepository;
		this.timesheetRepository = timesheetRepository;
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

		// ── People ──────────────────────────────────────────────────────────
		User systemAdmin = createUser(acme, "System Admin", "admin@example.com", Role.SYSTEM_ADMIN);
		createUser(acme, "Anita Sharma", "hr@example.com", Role.HR_MANAGER);
		createUser(acme, "Marcus Webb", "hr2@example.com", Role.HR_MANAGER);

		// Named David so the acceptance walkthrough reads as written; distinct
		// from the worker David Kumar below, who is a different person.
		User davidMiller = createUser(acme, "David Miller", "manager@example.com", Role.MANAGER);
		User sarahChen = createUser(acme, "Sarah Chen", "manager2@example.com", Role.MANAGER);
		User michaelTorres = createUser(acme, "Michael Torres", "manager3@example.com", Role.MANAGER);
		User elenaRodriguez = createUser(acme, "Elena Rodriguez", "manager4@example.com", Role.MANAGER);

		User priyaMenon = createUser(acme, "Priya Menon", "pm@example.com", Role.PROJECT_MANAGER);
		User jamesAnderson = createUser(acme, "James Anderson", "pm2@example.com", Role.PROJECT_MANAGER);

		// ── Teams: one per manager ──────────────────────────────────────────
		Team backend = teamRepository.save(new Team(
				acme, "Backend Engineering", "BACKEND", "Server-side platform team", davidMiller));
		Team frontend = teamRepository.save(new Team(
				acme, "Frontend Engineering", "FRONTEND", "Web client team", sarahChen));
		Team data = teamRepository.save(new Team(
				acme, "Data & Analytics", "DATA", "Warehousing, ETL and reporting", michaelTorres));
		Team mobile = teamRepository.save(new Team(
				acme, "Mobile Engineering", "MOBILE", "iOS and Android apps", elenaRodriguez));

		// ── Contracts: MVP 2 — exist before the assignments that bill them ──
		Contract websiteMigration = contractRepository.save(new Contract(
				"Website Migration", LocalDate.of(2026, 6, 1), 6, davidMiller, systemAdmin));
		Contract paymentsPlatform = contractRepository.save(new Contract(
				"Payments Platform", LocalDate.of(2026, 1, 5), 9, davidMiller, systemAdmin));
		Contract designSystem = contractRepository.save(new Contract(
				"Design System Program", LocalDate.of(2026, 3, 2), 4, sarahChen, systemAdmin));
		Contract customerPortal = contractRepository.save(new Contract(
				"Customer Portal Revamp", LocalDate.of(2026, 4, 1), 5, sarahChen, systemAdmin));
		Contract analyticsWarehouse = contractRepository.save(new Contract(
				"Analytics Warehouse Migration", LocalDate.of(2026, 2, 1), 8, michaelTorres, systemAdmin));
		Contract realtimeDashboards = contractRepository.save(new Contract(
				"Realtime Dashboards", LocalDate.of(2026, 5, 1), 3, michaelTorres, systemAdmin));
		Contract mobileAppV2 = contractRepository.save(new Contract(
				"Mobile App v2", LocalDate.of(2026, 1, 15), 7, elenaRodriguez, systemAdmin));
		Contract offlineSync = contractRepository.save(new Contract(
				"Offline Sync Module", LocalDate.of(2026, 6, 15), 4, elenaRodriguez, systemAdmin));

		// ── Workers: MVP 2 — carry their own billing rate; a team, not a single
		// assignment, so several teammates can log hours against the same one.
		// One of each non-ACTIVE lifecycle state is included on purpose.
		Worker john = createWorker(acme, "John Carter", "john@example.com",
				"EMP-1001", WorkerType.CONTRACTOR, LocalDate.of(2026, 6, 1), backend, "50.00");
		Worker davidKumar = createWorker(acme, "David Kumar", "david@example.com",
				"EMP-1002", WorkerType.EMPLOYEE, LocalDate.of(2025, 11, 17), backend, "65.00");
		// Left idle on purpose: an ACTIVE worker with no timesheet at all.
		createWorker(acme, "Kevin Zhao", "kevin@example.com",
				"EMP-1004", WorkerType.EMPLOYEE, LocalDate.of(2026, 2, 10), backend, "60.00");

		Worker rahul = createWorker(acme, "Rahul Nair", "rahul@example.com",
				"EMP-1003", WorkerType.EMPLOYEE, LocalDate.of(2026, 2, 2), frontend, "45.00");
		Worker lisaWong = createWorker(acme, "Lisa Wong", "lisa@example.com",
				"EMP-1005", WorkerType.CONTRACTOR, LocalDate.of(2026, 4, 6), frontend, "55.00");
		// On leave: still employed, simply not currently assignable to new work.
		Worker omarFarouk = createWorker(acme, "Omar Farouk", "omar@example.com",
				"EMP-1006", WorkerType.TEMPORARY_WORKER, LocalDate.of(2026, 1, 12), frontend, "35.00");
		omarFarouk.setStatus(WorkerStatus.INACTIVE);

		Worker ninaPatel = createWorker(acme, "Nina Patel", "nina@example.com",
				"EMP-1007", WorkerType.EMPLOYEE, LocalDate.of(2026, 2, 1), data, "70.00");
		Worker carlosMendez = createWorker(acme, "Carlos Mendez", "carlos@example.com",
				"EMP-1008", WorkerType.CONTRACTOR, LocalDate.of(2026, 2, 15), data, "58.00");
		// A completed engagement: offboarding preserves the historical record.
		Worker graceKim = createWorker(acme, "Grace Kim", "grace@example.com",
				"EMP-1009", WorkerType.EMPLOYEE, LocalDate.of(2025, 9, 1), data, "62.00");
		graceKim.offboard(LocalDate.of(2026, 7, 31));

		Worker tomBaker = createWorker(acme, "Tom Baker", "tom@example.com",
				"EMP-1010", WorkerType.EMPLOYEE, LocalDate.of(2026, 1, 20), mobile, "52.00");
		Worker aishaBello = createWorker(acme, "Aisha Bello", "aisha@example.com",
				"EMP-1011", WorkerType.CONTRACTOR, LocalDate.of(2026, 3, 5), mobile, "48.00");
		// Left free of any timesheet, so the walkthrough can create one live.
		createWorker(acme, "Yuki Tanaka", "yuki@example.com",
				"EMP-1012", WorkerType.TEMPORARY_WORKER, LocalDate.of(2026, 5, 18), mobile, "40.00");

		// ── Assignments: MVP 2 Team Assignments — team-owned, billed to a
		// contract, open to every active worker the team has.
		Assignment migration = assignmentRepository.save(new Assignment(
				backend, websiteMigration, davidMiller, "Website Migration",
				"Migrate the legacy marketing site onto the new platform",
				LocalDate.of(2026, 6, 1), null));
		assignmentRepository.save(new Assignment(
				backend, paymentsPlatform, davidMiller, "Payments API",
				"Build and harden the payments integration",
				LocalDate.of(2026, 1, 5), null));
		Assignment designSystemRollout = assignmentRepository.save(new Assignment(
				frontend, designSystem, sarahChen, "Design System Rollout",
				"Roll the shared component library out across the app",
				LocalDate.of(2026, 3, 2), null));
		Assignment customerPortalUi = assignmentRepository.save(new Assignment(
				frontend, customerPortal, sarahChen, "Customer Portal UI",
				"Rebuild the self-service customer portal",
				LocalDate.of(2026, 4, 1), null));
		Assignment warehouseEtl = assignmentRepository.save(new Assignment(
				data, analyticsWarehouse, michaelTorres, "Warehouse ETL Pipeline",
				"Migrate nightly batch jobs onto the new warehouse",
				LocalDate.of(2026, 2, 1), null));
		assignmentRepository.save(new Assignment(
				data, realtimeDashboards, michaelTorres, "Dashboard Widgets",
				"Ship the first set of realtime operational widgets",
				LocalDate.of(2026, 5, 1), null));
		// MVP 3 Soft Cap Rule demo: a 10h budget that Tom's seeded 40h week already
		// exceeds. Seeded directly via the repository (bypassing TimesheetService),
		// so it stays SUBMITTED and bills exactly as MVP2's demo script describes —
		// the cap only ever applies going through POST /api/timesheets/{id}/submit.
		// Small on purpose: Aisha's own 16h week (below) must individually exceed
		// it too, or capping her billable hours at the budget would be a no-op.
		Assignment iosAndroidRewrite = assignmentRepository.save(new Assignment(
				mobile, mobileAppV2, elenaRodriguez, "iOS/Android Core Rewrite",
				"Rewrite the core app modules on the new shared codebase",
				LocalDate.of(2026, 1, 15), null, new BigDecimal("10.00")));
		Assignment offlineSyncEngine = assignmentRepository.save(new Assignment(
				mobile, offlineSync, elenaRodriguez, "Offline Sync Engine",
				"Build conflict-free offline sync for field use",
				LocalDate.of(2026, 6, 15), null));

		// ── Timesheets: submitted weeks ready to bill. The week of 2026-08-17
		// is left free everywhere on purpose so the acceptance walkthrough can
		// create it. Two different workers logging the same assignment/week
		// (John + David Kumar, then Nina + Carlos) is the MVP 2 headline: a
		// Team Assignment accepts hours from every teammate, not one worker.
		seedSubmittedWeek(migration, john, BILLABLE_WEEK);
		seedSubmittedWeek(migration, davidKumar, BILLABLE_WEEK);
		seedSubmittedWeek(designSystemRollout, rahul, BILLABLE_WEEK);
		seedSubmittedWeek(customerPortalUi, lisaWong, BILLABLE_WEEK);
		seedSubmittedWeek(warehouseEtl, ninaPatel, BILLABLE_WEEK);
		seedSubmittedWeek(warehouseEtl, carlosMendez, BILLABLE_WEEK);
		seedSubmittedWeek(iosAndroidRewrite, tomBaker, BILLABLE_WEEK);
		// MVP 3 Soft Cap Rule: Aisha's 16h joins Tom's 40h already logged against
		// iOS/Android Core Rewrite's 10h budget — 56h total, over cap — so this
		// week lands NEEDS_REVIEW for Elena to resolve, ready to demo without any
		// live action first. See docs/MVP3.md.
		seedNeedsReviewWeek(iosAndroidRewrite, aishaBello, BILLABLE_WEEK);
		// A DRAFT week, still being filled in — shows the pre-submit state too.
		seedDraftWeek(offlineSyncEngine, aishaBello, BILLABLE_WEEK);
		// kevinZhao, omarFarouk and graceKim intentionally have none: an idle
		// active worker, an inactive one, and an offboarded one, respectively.

		// ── Invoices: all four statuses represented. Payments Platform and
		// Customer Portal already have a decided history; Website Migration
		// and Analytics Warehouse Migration are left un-invoiced on purpose so
		// POST /api/invoices/generate has real submitted hours to bill live.
		Invoice draftInvoice = new Invoice(
				designSystem, sarahChen, priyaMenon,
				LocalDate.of(2026, 8, 3), LocalDate.of(2026, 8, 9),
				new BigDecimal("1800.00"), "Draft — still gathering this week's hours");
		invoiceRepository.save(draftInvoice);

		Invoice pendingInvoice = new Invoice(
				paymentsPlatform, davidMiller, priyaMenon,
				LocalDate.of(2026, 8, 3), LocalDate.of(2026, 8, 9),
				new BigDecimal("6400.00"), "August week 1 hours, verified against timesheets");
		pendingInvoice.submit();
		invoiceRepository.save(pendingInvoice);

		Invoice approvedInvoice = new Invoice(
				paymentsPlatform, davidMiller, priyaMenon,
				LocalDate.of(2026, 7, 27), LocalDate.of(2026, 8, 2),
				new BigDecimal("6400.00"), "July week 5 hours, verified against timesheets");
		approvedInvoice.submit();
		approvedInvoice.approve("Looks good, approved for payment");
		invoiceRepository.save(approvedInvoice);

		Invoice rejectedInvoice = new Invoice(
				customerPortal, sarahChen, jamesAnderson,
				LocalDate.of(2026, 7, 20), LocalDate.of(2026, 7, 26),
				new BigDecimal("4950.00"), "July week 4 hours, verified against timesheets");
		rejectedInvoice.submit();
		rejectedInvoice.reject("Hours exceed the approved budget for this sprint; please re-verify");
		invoiceRepository.save(rejectedInvoice);

		log.info("Seeded development data for {}: {} users, {} teams, {} contracts, "
						+ "{} assignments, {} timesheets, {} invoices (all accounts use password {})",
				acme.getName(), userRepository.count(), teamRepository.count(), contractRepository.count(),
				assignmentRepository.count(), timesheetRepository.count(), invoiceRepository.count(),
				DEFAULT_PASSWORD);
	}

	private User createUser(Organization organization, String name, String email, Role role) {
		return userRepository.save(new User(
				organization, name, email, passwordEncoder.encode(DEFAULT_PASSWORD), role));
	}

	private Worker createWorker(Organization organization, String name, String email, String employeeCode,
			WorkerType type, LocalDate startDate, Team team, String hourlyRate) {
		User user = createUser(organization, name, email, Role.WORKER);
		Worker worker = new Worker(user, organization, employeeCode, type, startDate, new BigDecimal(hourlyRate));
		worker.setTeam(team);
		return workerRepository.save(worker);
	}

	/** A full Monday-to-Friday week at 8 hours a day, already submitted. */
	private void seedSubmittedWeek(Assignment assignment, Worker worker, LocalDate weekStart) {
		Timesheet timesheet = new Timesheet(assignment, worker, weekStart);
		timesheet.replaceEntries(fullWeekEntries(weekStart));
		timesheet.submit();
		timesheetRepository.save(timesheet);
	}

	/** The first three days only, left in DRAFT so the UI has an in-progress week to show. */
	private void seedDraftWeek(Assignment assignment, Worker worker, LocalDate weekStart) {
		Timesheet timesheet = new Timesheet(assignment, worker, weekStart);
		timesheet.replaceEntries(fullWeekEntries(weekStart).subList(0, 3));
		timesheetRepository.save(timesheet);
	}

	/**
	 * MVP 3: the first two days only (16h), submitted and immediately flagged —
	 * exactly what {@code TimesheetService.submitTimesheet} would do live once
	 * this pushes the team over the assignment's budget, done here directly so
	 * the Manager Soft Cap Review screen has something to show without first
	 * requiring a live submission.
	 */
	private void seedNeedsReviewWeek(Assignment assignment, Worker worker, LocalDate weekStart) {
		Timesheet timesheet = new Timesheet(assignment, worker, weekStart);
		timesheet.replaceEntries(fullWeekEntries(weekStart).subList(0, 2));
		timesheet.submit();
		timesheet.flagForReview();
		timesheetRepository.save(timesheet);
	}

	private List<TimesheetEntry> fullWeekEntries(LocalDate weekStart) {
		return List.of(
				new TimesheetEntry(weekStart, new BigDecimal("8.00"), "Content audit"),
				new TimesheetEntry(weekStart.plusDays(1), new BigDecimal("8.00"), "Template porting"),
				new TimesheetEntry(weekStart.plusDays(2), new BigDecimal("8.00"), "Template porting"),
				new TimesheetEntry(weekStart.plusDays(3), new BigDecimal("8.00"), "Redirect mapping"),
				new TimesheetEntry(weekStart.plusDays(4), new BigDecimal("8.00"), "QA and handover"));
	}
}
