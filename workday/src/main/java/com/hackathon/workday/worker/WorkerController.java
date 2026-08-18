package com.hackathon.workday.worker;

import com.hackathon.workday.common.response.PageResponse;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.worker.dto.CreateWorkerRequest;
import com.hackathon.workday.worker.dto.OffboardWorkerRequest;
import com.hackathon.workday.worker.dto.UpdateWorkerRequest;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Role gates live here as {@code @PreAuthorize}; the finer question of which
 * records this caller may touch is answered inside {@link WorkerService}.
 */
@RestController
@RequestMapping("/api/workers")
public class WorkerController {

	private final WorkerService workerService;

	public WorkerController(WorkerService workerService) {
		this.workerService = workerService;
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('HR_MANAGER', 'SYSTEM_ADMIN')")
	public ResponseEntity<WorkerResponse> onboardWorker(
			@Valid @RequestBody CreateWorkerRequest request,
			@AuthenticationPrincipal AuthPrincipal actor) {
		WorkerResponse created = workerService.onboardWorker(request, actor);
		return ResponseEntity.status(HttpStatus.CREATED).body(created);
	}

	@GetMapping
	@PreAuthorize("hasAnyRole('HR_MANAGER', 'SYSTEM_ADMIN', 'MANAGER')")
	public PageResponse<WorkerResponse> listWorkers(
			@RequestParam(required = false) WorkerStatus status,
			@PageableDefault(size = 20, sort = "id", direction = Sort.Direction.ASC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		Page<WorkerResponse> page = workerService.listWorkers(actor, status, pageable);
		return PageResponse.from(page, response -> response);
	}

	/** The caller's own worker record, resolved from the token. */
	@GetMapping("/me")
	@PreAuthorize("hasRole('WORKER')")
	public WorkerResponse getOwnProfile(@AuthenticationPrincipal AuthPrincipal actor) {
		return workerService.getOwnProfile(actor);
	}

	@GetMapping("/{id}")
	public WorkerResponse getWorker(
			@PathVariable Long id,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return workerService.getWorker(id, actor);
	}

	@PatchMapping("/{id}")
	@PreAuthorize("hasAnyRole('HR_MANAGER', 'SYSTEM_ADMIN')")
	public WorkerResponse updateWorker(
			@PathVariable Long id,
			@Valid @RequestBody UpdateWorkerRequest request,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return workerService.updateWorker(id, request, actor);
	}

	@PostMapping("/{id}/offboard")
	@PreAuthorize("hasAnyRole('HR_MANAGER', 'SYSTEM_ADMIN')")
	public WorkerResponse offboardWorker(
			@PathVariable Long id,
			@RequestBody(required = false) OffboardWorkerRequest request,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return workerService.offboardWorker(id, request, actor);
	}
}
