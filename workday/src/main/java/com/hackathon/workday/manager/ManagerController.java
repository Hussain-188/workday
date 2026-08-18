package com.hackathon.workday.manager;

import com.hackathon.workday.assignment.AssignmentService;
import com.hackathon.workday.assignment.AssignmentStatus;
import com.hackathon.workday.assignment.dto.AssignmentResponse;
import com.hackathon.workday.common.response.PageResponse;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.team.TeamService;
import com.hackathon.workday.team.dto.TeamResponse;
import com.hackathon.workday.timesheet.TimesheetService;
import com.hackathon.workday.timesheet.TimesheetStatus;
import com.hackathon.workday.timesheet.dto.TimesheetResponse;
import com.hackathon.workday.worker.WorkerService;
import com.hackathon.workday.worker.WorkerStatus;
import com.hackathon.workday.worker.dto.WorkerResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * A read-only facade over the domain services, giving the frontend one
 * manager-shaped surface. It adds no logic of its own: every call lands in the
 * owning module's service, which applies the same manager scoping as elsewhere.
 */
@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasAnyRole('MANAGER', 'SYSTEM_ADMIN')")
public class ManagerController {

	private final TeamService teamService;
	private final WorkerService workerService;
	private final AssignmentService assignmentService;
	private final TimesheetService timesheetService;

	public ManagerController(TeamService teamService, WorkerService workerService,
			AssignmentService assignmentService, TimesheetService timesheetService) {
		this.teamService = teamService;
		this.workerService = workerService;
		this.assignmentService = assignmentService;
		this.timesheetService = timesheetService;
	}

	@GetMapping("/teams")
	public PageResponse<TeamResponse> myTeams(
			@PageableDefault(size = 20, sort = "id", direction = Sort.Direction.ASC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return PageResponse.from(teamService.listTeams(actor, pageable), response -> response);
	}

	@GetMapping("/workers")
	public PageResponse<WorkerResponse> myWorkers(
			@RequestParam(required = false) WorkerStatus status,
			@PageableDefault(size = 20, sort = "id", direction = Sort.Direction.ASC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return PageResponse.from(workerService.listWorkers(actor, status, pageable), response -> response);
	}

	@GetMapping("/assignments")
	public PageResponse<AssignmentResponse> myAssignments(
			@RequestParam(required = false) AssignmentStatus status,
			@PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return PageResponse.from(
				assignmentService.listAssignments(actor, status, pageable), response -> response);
	}

	@GetMapping("/timesheets")
	public PageResponse<TimesheetResponse> myTeamTimesheets(
			@RequestParam(required = false) TimesheetStatus status,
			@PageableDefault(size = 20, sort = "weekStartDate", direction = Sort.Direction.DESC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return PageResponse.from(
				timesheetService.listVisibleTimesheets(actor, status, pageable), response -> response);
	}

	@GetMapping("/timesheets/{id}")
	public TimesheetResponse teamTimesheet(
			@PathVariable Long id,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return timesheetService.getTimesheet(id, actor);
	}
}
