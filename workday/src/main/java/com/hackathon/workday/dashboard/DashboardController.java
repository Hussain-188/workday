package com.hackathon.workday.dashboard;

import com.hackathon.workday.assignment.AssignmentRepository;
import com.hackathon.workday.assignment.AssignmentStatus;
import com.hackathon.workday.common.exception.ResourceNotFoundException;
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

	public DashboardController(WorkerRepository workerRepository, TeamRepository teamRepository,
			AssignmentRepository assignmentRepository, TimesheetRepository timesheetRepository) {
		this.workerRepository = workerRepository;
		this.teamRepository = teamRepository;
		this.assignmentRepository = assignmentRepository;
		this.timesheetRepository = timesheetRepository;
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
			}
			case WORKER -> {
				Worker self = workerRepository.findByUserId(userId)
						.orElseThrow(() -> new ResourceNotFoundException(
								"No worker record exists for the authenticated user"));
				tiles.put("active_assignments",
						assignmentRepository.countByWorkerIdAndStatus(self.getId(), AssignmentStatus.ACTIVE));
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
