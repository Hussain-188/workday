package com.hackathon.workday.team;

import com.hackathon.workday.common.response.PageResponse;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.team.dto.CreateTeamRequest;
import com.hackathon.workday.team.dto.TeamResponse;
import com.hackathon.workday.worker.WorkerService;
import com.hackathon.workday.worker.dto.WorkerResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

	private final TeamService teamService;
	private final WorkerService workerService;

	public TeamController(TeamService teamService, WorkerService workerService) {
		this.teamService = teamService;
		this.workerService = workerService;
	}

	/** Team structure is an administrative concern, so admin-only in MVP 1. */
	@PostMapping
	@PreAuthorize("hasRole('SYSTEM_ADMIN')")
	public ResponseEntity<TeamResponse> createTeam(
			@Valid @RequestBody CreateTeamRequest request,
			@AuthenticationPrincipal AuthPrincipal actor) {
		TeamResponse created = teamService.createTeam(request, actor);
		return ResponseEntity.status(HttpStatus.CREATED).body(created);
	}

	@GetMapping
	@PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'HR_MANAGER', 'MANAGER')")
	public PageResponse<TeamResponse> listTeams(
			@PageableDefault(size = 20, sort = "id", direction = Sort.Direction.ASC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		Page<TeamResponse> page = teamService.listTeams(actor, pageable);
		return PageResponse.from(page, response -> response);
	}

	/** Open to every role; the service decides whether this caller may see it. */
	@GetMapping("/{id}")
	public TeamResponse getTeam(
			@PathVariable Long id,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return teamService.getTeam(id, actor);
	}

	@GetMapping("/{id}/workers")
	public PageResponse<WorkerResponse> listTeamWorkers(
			@PathVariable Long id,
			@PageableDefault(size = 20, sort = "id", direction = Sort.Direction.ASC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		Page<WorkerResponse> page = workerService.listTeamWorkers(id, actor, pageable);
		return PageResponse.from(page, response -> response);
	}
}
