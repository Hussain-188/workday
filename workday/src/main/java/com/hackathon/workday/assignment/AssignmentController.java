package com.hackathon.workday.assignment;

import com.hackathon.workday.assignment.dto.AssignmentResponse;
import com.hackathon.workday.assignment.dto.CreateAssignmentRequest;
import com.hackathon.workday.assignment.dto.UpdateAssignmentStatusRequest;
import com.hackathon.workday.common.response.PageResponse;
import com.hackathon.workday.security.AuthPrincipal;
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

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {

	private final AssignmentService assignmentService;

	public AssignmentController(AssignmentService assignmentService) {
		this.assignmentService = assignmentService;
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('MANAGER', 'SYSTEM_ADMIN')")
	public ResponseEntity<AssignmentResponse> createAssignment(
			@Valid @RequestBody CreateAssignmentRequest request,
			@AuthenticationPrincipal AuthPrincipal actor) {
		AssignmentResponse created = assignmentService.createAssignment(request, actor);
		return ResponseEntity.status(HttpStatus.CREATED).body(created);
	}

	@GetMapping
	@PreAuthorize("hasAnyRole('MANAGER', 'SYSTEM_ADMIN', 'HR_MANAGER')")
	public PageResponse<AssignmentResponse> listAssignments(
			@RequestParam(required = false) AssignmentStatus status,
			@PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		Page<AssignmentResponse> page = assignmentService.listAssignments(actor, status, pageable);
		return PageResponse.from(page, response -> response);
	}

	/** The caller's own assignments. The worker is taken from the token. */
	@GetMapping("/my")
	@PreAuthorize("hasRole('WORKER')")
	public PageResponse<AssignmentResponse> listMyAssignments(
			@RequestParam(required = false) AssignmentStatus status,
			@PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		Page<AssignmentResponse> page = assignmentService.listOwnAssignments(actor, status, pageable);
		return PageResponse.from(page, response -> response);
	}

	@GetMapping("/{id}")
	public AssignmentResponse getAssignment(
			@PathVariable Long id,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return assignmentService.getAssignment(id, actor);
	}

	@PatchMapping("/{id}/status")
	@PreAuthorize("hasAnyRole('MANAGER', 'SYSTEM_ADMIN')")
	public AssignmentResponse updateStatus(
			@PathVariable Long id,
			@Valid @RequestBody UpdateAssignmentStatusRequest request,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return assignmentService.updateStatus(id, request, actor);
	}
}
