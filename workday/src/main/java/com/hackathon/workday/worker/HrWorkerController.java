package com.hackathon.workday.worker;

import com.hackathon.workday.common.response.PageResponse;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.worker.dto.WorkerResponse;
import org.springframework.data.domain.Page;
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
 * The HR-facing read surface. It shares {@link WorkerService} with
 * {@code /api/workers} rather than duplicating logic; the separate path simply
 * gives the frontend a stable, role-shaped entry point.
 */
@RestController
@RequestMapping("/api/hr/workers")
@PreAuthorize("hasAnyRole('HR_MANAGER', 'SYSTEM_ADMIN')")
public class HrWorkerController {

	private final WorkerService workerService;

	public HrWorkerController(WorkerService workerService) {
		this.workerService = workerService;
	}

	@GetMapping
	public PageResponse<WorkerResponse> listWorkers(
			@RequestParam(required = false) WorkerStatus status,
			@PageableDefault(size = 20, sort = "id", direction = Sort.Direction.ASC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		Page<WorkerResponse> page = workerService.listWorkers(actor, status, pageable);
		return PageResponse.from(page, response -> response);
	}

	@GetMapping("/{id}")
	public WorkerResponse getWorker(
			@PathVariable Long id,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return workerService.getWorker(id, actor);
	}
}
