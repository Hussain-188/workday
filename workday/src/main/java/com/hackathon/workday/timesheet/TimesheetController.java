package com.hackathon.workday.timesheet;

import com.hackathon.workday.common.response.PageResponse;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.timesheet.dto.CreateTimesheetRequest;
import com.hackathon.workday.timesheet.dto.TimesheetResponse;
import com.hackathon.workday.timesheet.dto.UpdateTimesheetEntriesRequest;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/timesheets")
public class TimesheetController {

	private final TimesheetService timesheetService;

	public TimesheetController(TimesheetService timesheetService) {
		this.timesheetService = timesheetService;
	}

	/** Only a worker records hours; managers do not file timesheets in MVP 1. */
	@PostMapping
	@PreAuthorize("hasRole('WORKER')")
	public ResponseEntity<TimesheetResponse> createTimesheet(
			@Valid @RequestBody CreateTimesheetRequest request,
			@AuthenticationPrincipal AuthPrincipal actor) {
		TimesheetResponse created = timesheetService.createTimesheet(request, actor);
		return ResponseEntity.status(HttpStatus.CREATED).body(created);
	}

	/**
	 * Timesheets visible to the caller: the whole organization for an admin or
	 * HR user, only their own teams for a manager. Workers are excluded — they
	 * have /my, which is scoped to themselves.
	 */
	@GetMapping
	@PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'HR_MANAGER', 'MANAGER')")
	public PageResponse<TimesheetResponse> listTimesheets(
			@RequestParam(required = false) TimesheetStatus status,
			@PageableDefault(size = 20, sort = "weekStartDate", direction = Sort.Direction.DESC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		Page<TimesheetResponse> page = timesheetService.listVisibleTimesheets(actor, status, pageable);
		return PageResponse.from(page, response -> response);
	}

	@GetMapping("/my")
	@PreAuthorize("hasRole('WORKER')")
	public PageResponse<TimesheetResponse> listMyTimesheets(
			@RequestParam(required = false) TimesheetStatus status,
			@PageableDefault(size = 20, sort = "weekStartDate", direction = Sort.Direction.DESC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		Page<TimesheetResponse> page = timesheetService.listOwnTimesheets(actor, status, pageable);
		return PageResponse.from(page, response -> response);
	}

	@GetMapping("/{id}")
	public TimesheetResponse getTimesheet(
			@PathVariable Long id,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return timesheetService.getTimesheet(id, actor);
	}

	/** Full replacement of the week's entries; DRAFT only. */
	@PutMapping("/{id}/entries")
	@PreAuthorize("hasRole('WORKER')")
	public TimesheetResponse updateEntries(
			@PathVariable Long id,
			@Valid @RequestBody UpdateTimesheetEntriesRequest request,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return timesheetService.updateEntries(id, request, actor);
	}

	@PostMapping("/{id}/submit")
	@PreAuthorize("hasRole('WORKER')")
	public TimesheetResponse submitTimesheet(
			@PathVariable Long id,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return timesheetService.submitTimesheet(id, actor);
	}
}
