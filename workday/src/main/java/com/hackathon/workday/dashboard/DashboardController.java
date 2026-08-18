package com.hackathon.workday.dashboard;

import com.hackathon.workday.assignment.AssignmentRepository;
import com.hackathon.workday.assignment.AssignmentStatus;
import com.hackathon.workday.common.exception.ResourceNotFoundException;
import com.hackathon.workday.contract.ContractRepository;
import com.hackathon.workday.invoice.InvoiceRepository;
import com.hackathon.workday.invoice.InvoiceStatus;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.team.TeamRepository;
import com.hackathon.workday.timesheet.TimesheetRepository;
import com.hackathon.workday.timesheet.TimesheetStatus;
import com.hackathon.workday.worker.Worker;
import com.hackathon.workday.worker.WorkerRepository;
import com.hackathon.workday.worker.WorkerStatus;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Headline counts for the landing screen, shaped by who is asking: an admin
 * sees the organization, a manager their teams, a worker only their own work.
 *
 * <p>Returns an ordered map rather than a fixed DTO so each role can surface a
 * different set of tiles without the client needing to know them in advance.
 * Every figure is a COUNT/SUM in the database, never a loaded collection.
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

	private final WorkerRepository workerRepository;
	private final TeamRepository teamRepository;
	private final AssignmentRepository assignmentRepository;
	private final TimesheetRepository timesheetRepository;
	private final ContractRepository contractRepository;
	private final InvoiceRepository invoiceRepository;

	public DashboardController(WorkerRepository workerRepository, TeamRepository teamRepository,
			AssignmentRepository assignmentRepository, TimesheetRepository timesheetRepository,
			ContractRepository contractRepository, InvoiceRepository invoiceRepository) {
		this.workerRepository = workerRepository;
		this.teamRepository = teamRepository;
		this.assignmentRepository = assignmentRepository;
		this.timesheetRepository = timesheetRepository;
		this.contractRepository = contractRepository;
		this.invoiceRepository = invoiceRepository;
	}

	@GetMapping("/summary")
	@Transactional(readOnly = true)
	public Map<String, Object> summary(@AuthenticationPrincipal AuthPrincipal actor) {
		Long organizationId = actor.getOrganizationId();
		Long userId = actor.getUserId();
		Map<String, Object> tiles = new LinkedHashMap<>();

		switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER -> {
				tiles.put("total_workers", workerRepository.countByOrganizationId(organizationId));
				tiles.put("active_workers",
						workerRepository.countByOrganizationIdAndStatus(organizationId, WorkerStatus.ACTIVE));
				tiles.put("offboarded_workers",
						workerRepository.countByOrganizationIdAndStatus(organizationId, WorkerStatus.OFFBOARDED));
				tiles.put("teams", teamRepository.countByOrganizationId(organizationId));
				tiles.put("active_assignments", assignmentRepository
						.countByOrganizationIdAndStatus(organizationId, AssignmentStatus.ACTIVE));
				tiles.put("submitted_timesheets", timesheetRepository
						.countByOrganizationIdAndStatus(organizationId, TimesheetStatus.SUBMITTED));
				tiles.put("contracts", contractRepository.countByOrganizationId(organizationId));
			}
			case MANAGER -> {
				tiles.put("my_teams", teamRepository.countByOrganizationIdAndManagerId(organizationId, userId));
				tiles.put("my_workers", workerRepository.countByTeamManagerId(userId));
				tiles.put("active_assignments", assignmentRepository
						.countByTeamManagerIdAndStatus(userId, AssignmentStatus.ACTIVE));
				tiles.put("submitted_timesheets", timesheetRepository
						.countByTeamManagerIdAndStatus(userId, TimesheetStatus.SUBMITTED));
				tiles.put("draft_timesheets", timesheetRepository
						.countByTeamManagerIdAndStatus(userId, TimesheetStatus.DRAFT));
				tiles.put("invoices_pending_approval", invoiceRepository
						.countByManagerIdAndStatus(userId, InvoiceStatus.PENDING_APPROVAL));
			}
			case PROJECT_MANAGER -> tiles.put("invoices_pending_approval", invoiceRepository
					.countByProjectManagerIdAndStatus(userId, InvoiceStatus.PENDING_APPROVAL));
			case WORKER -> {
				Worker self = workerRepository.findByUserId(userId)
						.orElseThrow(() -> new ResourceNotFoundException(
								"No worker record exists for the authenticated user"));
				// MVP 2: assignments are team-owned, so "my active assignments" means
				// the active work items open on the worker's own team.
				tiles.put("active_assignments", self.getTeam() == null ? 0
						: assignmentRepository.countByTeamIdAndStatus(self.getTeam().getId(), AssignmentStatus.ACTIVE));
				tiles.put("draft_timesheets",
						timesheetRepository.countByWorkerIdAndStatus(self.getId(), TimesheetStatus.DRAFT));
				tiles.put("submitted_timesheets",
						timesheetRepository.countByWorkerIdAndStatus(self.getId(), TimesheetStatus.SUBMITTED));
				tiles.put("hours_submitted", timesheetRepository
						.sumHoursByWorkerIdAndStatus(self.getId(), TimesheetStatus.SUBMITTED));
			}
		}

		return tiles;
	}
}
