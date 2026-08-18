package com.hackathon.workday.timesheet;

import com.hackathon.workday.assignment.Assignment;
import com.hackathon.workday.assignment.AssignmentRepository;
import com.hackathon.workday.common.audit.AuditAction;
import com.hackathon.workday.common.audit.AuditService;
import com.hackathon.workday.common.exception.DuplicateTimesheetException;
import com.hackathon.workday.common.exception.ForbiddenOperationException;
import com.hackathon.workday.common.exception.InvalidTimesheetStateException;
import com.hackathon.workday.common.exception.ResourceNotFoundException;
import com.hackathon.workday.common.exception.UnauthorizedAccessException;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.timesheet.dto.CreateTimesheetRequest;
import com.hackathon.workday.timesheet.dto.TimesheetResponse;
import com.hackathon.workday.timesheet.dto.UpdateTimesheetEntriesRequest;
import com.hackathon.workday.worker.Worker;
import com.hackathon.workday.worker.WorkerRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Weekly hour recording. Every write path starts from the authenticated user,
 * resolves their worker record, and only then touches a timesheet — a client
 * cannot name the worker whose hours it is editing.
 */
@Service
public class TimesheetService {

	private static final String ENTITY = "Timesheet";

	private final TimesheetRepository timesheetRepository;
	private final WorkerRepository workerRepository;
	private final AssignmentRepository assignmentRepository;
	private final AuditService auditService;
	private final TimesheetMapper timesheetMapper;

	public TimesheetService(TimesheetRepository timesheetRepository, WorkerRepository workerRepository,
			AssignmentRepository assignmentRepository, AuditService auditService,
			TimesheetMapper timesheetMapper) {
		this.timesheetRepository = timesheetRepository;
		this.workerRepository = workerRepository;
		this.assignmentRepository = assignmentRepository;
		this.auditService = auditService;
		this.timesheetMapper = timesheetMapper;
	}

	/**
	 * Opens a week. MVP 2: assignments are team-owned, so "belongs to the
	 * caller" means the caller is an active member of the assignment's team —
	 * any teammate may open their own week against the same assignment. The
	 * caller must still be an active worker — an offboarded worker cannot
	 * start new weeks, though their existing ones stay readable.
	 */
	@Transactional
	public TimesheetResponse createTimesheet(CreateTimesheetRequest request, AuthPrincipal actor) {
		Worker self = requireSelfWorker(actor);
		if (!self.isActive()) {
			throw new InvalidTimesheetStateException(
					"Worker is " + self.getStatus() + " and cannot create new timesheets");
		}

		Assignment assignment = assignmentRepository.findWithDetailsById(request.assignmentId())
				.orElseThrow(() -> new ResourceNotFoundException("Assignment", request.assignmentId()));

		// Ownership is proven against the resolved worker's team, not a request field.
		if (self.getTeam() == null || !assignment.getTeam().getId().equals(self.getTeam().getId())) {
			throw new UnauthorizedAccessException("This assignment does not belong to your team");
		}
		if (!assignment.isActive()) {
			throw new InvalidTimesheetStateException(
					"Assignment is " + assignment.getStatus() + " and cannot receive new timesheets");
		}

		// Checked here for a clean error; the unique key is the real guarantee.
		if (timesheetRepository.existsByAssignmentIdAndWorkerIdAndWeekStartDate(
				assignment.getId(), self.getId(), request.weekStartDate())) {
			throw new DuplicateTimesheetException(
					"A timesheet already exists for this assignment for the week of " + request.weekStartDate());
		}

		Timesheet timesheet = new Timesheet(assignment, self, request.weekStartDate());
		if (request.entries() != null && !request.entries().isEmpty()) {
			timesheet.replaceEntries(timesheetMapper.toEntities(request.entries()));
		}
		timesheetRepository.save(timesheet);

		auditService.record(actor.getUserId(), AuditAction.TIMESHEET_CREATED, ENTITY, timesheet.getId(),
				"assignmentId=" + assignment.getId() + ", week=" + timesheet.getWeekStartDate());

		return timesheetMapper.toResponse(timesheet);
	}

	/**
	 * Replaces the week's entries. Only a DRAFT owned by the caller can change;
	 * the aggregate rejects out-of-week dates and out-of-range hours.
	 */
	@Transactional
	public TimesheetResponse updateEntries(Long timesheetId, UpdateTimesheetEntriesRequest request,
			AuthPrincipal actor) {
		Timesheet timesheet = requireOwnTimesheet(timesheetId, actor);
		List<TimesheetEntry> entries = timesheetMapper.toEntities(request.entries());
		timesheet.replaceEntries(entries);
		return timesheetMapper.toResponse(timesheet);
	}

	/**
	 * Marks the week complete: verify ownership, verify it is still DRAFT,
	 * recompute the total from the entries, then flip the status.
	 *
	 * <p>MVP 3 Soft Cap Rule: if the assignment carries an {@code allocated_hours}
	 * budget, and this submission pushes the team's total logged hours on it
	 * past that budget, the week is flagged NEEDS_REVIEW instead of being left
	 * SUBMITTED-and-billable.
	 */
	@Transactional
	public TimesheetResponse submitTimesheet(Long timesheetId, AuthPrincipal actor) {
		Timesheet timesheet = requireOwnTimesheet(timesheetId, actor);
		timesheet.submit();

		Assignment assignment = timesheet.getAssignment();
		BigDecimal allocatedHours = assignment.getAllocatedHours();
		if (allocatedHours != null) {
			BigDecimal alreadyLogged = timesheetRepository.sumHoursByAssignmentIdAndStatusIn(
					assignment.getId(), List.of(TimesheetStatus.SUBMITTED, TimesheetStatus.NEEDS_REVIEW));
			BigDecimal projectedTotal = alreadyLogged.add(timesheet.getTotalHours());
			if (projectedTotal.compareTo(allocatedHours) > 0) {
				timesheet.flagForReview();
				auditService.record(actor.getUserId(), AuditAction.TIMESHEET_FLAGGED_FOR_REVIEW, ENTITY,
						timesheet.getId(), "assignmentId=" + assignment.getId() + ", allocatedHours=" + allocatedHours
								+ ", projectedTotal=" + projectedTotal);
			}
		}

		auditService.record(actor.getUserId(), AuditAction.TIMESHEET_SUBMITTED, ENTITY, timesheet.getId(),
				"week=" + timesheet.getWeekStartDate() + ", totalHours=" + timesheet.getTotalHours());

		return timesheetMapper.toResponse(timesheet);
	}

	/**
	 * The Soft Cap Rule's resolution: a manager decides a NEEDS_REVIEW week,
	 * either approving the overage in full or capping its billable hours at the
	 * assignment's budget. Either way it returns to SUBMITTED, ready for the
	 * next Milestone Billing invoice.
	 */
	@Transactional
	public TimesheetResponse resolveReview(Long timesheetId, boolean approveOverage, AuthPrincipal actor) {
		Timesheet timesheet = requireTimesheet(timesheetId);
		Assignment assignment = timesheet.getAssignment();
		if (!assignment.getTeam().getOrganization().getId().equals(actor.getOrganizationId())) {
			throw new UnauthorizedAccessException("This timesheet belongs to another organization");
		}
		if (!assignment.getTeam().isManagedBy(actor.getUserId())) {
			throw new UnauthorizedAccessException("This timesheet belongs to a team you do not manage");
		}

		// Defensive: a timesheet only reaches NEEDS_REVIEW because its assignment
		// had a budget at submission time, but nothing here forbids clearing it
		// later. Cap against zero rather than letting the entity NPE on it.
		BigDecimal allocatedHours = assignment.getAllocatedHours() != null
				? assignment.getAllocatedHours()
				: BigDecimal.ZERO;
		timesheet.resolveReview(approveOverage, allocatedHours);

		auditService.record(actor.getUserId(), AuditAction.TIMESHEET_REVIEW_RESOLVED, ENTITY, timesheet.getId(),
				"approveOverage=" + approveOverage + ", billableHours=" + timesheet.getBillableHours());

		return timesheetMapper.toResponse(timesheet);
	}

	/** The caller's own history. Offboarding does not hide it. */
	@Transactional(readOnly = true)
	public Page<TimesheetResponse> listOwnTimesheets(AuthPrincipal actor, TimesheetStatus status, Pageable pageable) {
		Worker self = requireSelfWorker(actor);
		Page<Timesheet> timesheets = status == null
				? timesheetRepository.findByWorkerId(self.getId(), pageable)
				: timesheetRepository.findByWorkerIdAndStatus(self.getId(), status, pageable);
		return timesheets.map(timesheetMapper::toResponse);
	}

	/** Manager view: every timesheet across the teams they manage. */
	@Transactional(readOnly = true)
	public Page<TimesheetResponse> listVisibleTimesheets(AuthPrincipal actor, TimesheetStatus status,
			Pageable pageable) {
		Page<Timesheet> timesheets = switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER ->
					timesheetRepository.findByOrganizationId(actor.getOrganizationId(), pageable);
			case MANAGER -> status == null
					? timesheetRepository.findByTeamManagerId(actor.getUserId(), pageable)
					: timesheetRepository.findByTeamManagerIdAndStatus(actor.getUserId(), status, pageable);
			case PROJECT_MANAGER -> throw new ForbiddenOperationException(
					"Project managers cannot list timesheets");
			case WORKER -> throw new ForbiddenOperationException(
					"Workers cannot list team timesheets; use GET /api/timesheets/my");
		};
		return timesheets.map(timesheetMapper::toResponse);
	}

	@Transactional(readOnly = true)
	public TimesheetResponse getTimesheet(Long timesheetId, AuthPrincipal actor) {
		Timesheet timesheet = requireTimesheet(timesheetId);
		assertCanView(timesheet, actor);
		return timesheetMapper.toResponse(timesheet);
	}

	// ---------------------------------------------------------------- helpers

	private Timesheet requireTimesheet(Long timesheetId) {
		return timesheetRepository.findWithDetailsById(timesheetId)
				.orElseThrow(() -> new ResourceNotFoundException(ENTITY, timesheetId));
	}

	/** Loads a timesheet and proves the caller is the worker it belongs to. */
	private Timesheet requireOwnTimesheet(Long timesheetId, AuthPrincipal actor) {
		Timesheet timesheet = requireTimesheet(timesheetId);
		Worker self = requireSelfWorker(actor);
		if (!timesheet.getWorker().getId().equals(self.getId())) {
			throw new UnauthorizedAccessException("This timesheet does not belong to you");
		}
		return timesheet;
	}

	private Worker requireSelfWorker(AuthPrincipal actor) {
		return workerRepository.findByUserId(actor.getUserId())
				.orElseThrow(() -> new ResourceNotFoundException(
						"No worker record exists for the authenticated user"));
	}

	/**
	 * Workers see only their own weeks; a manager sees only the teams they own.
	 * Historical timesheets of offboarded workers remain visible to both.
	 */
	private void assertCanView(Timesheet timesheet, AuthPrincipal actor) {
		Assignment assignment = timesheet.getAssignment();
		if (!assignment.getTeam().getOrganization().getId().equals(actor.getOrganizationId())) {
			throw new UnauthorizedAccessException("This timesheet belongs to another organization");
		}

		switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER -> {
				// organization-wide visibility
			}
			case MANAGER -> {
				if (!assignment.getTeam().isManagedBy(actor.getUserId())) {
					throw new UnauthorizedAccessException(
							"This timesheet belongs to a team you do not manage");
				}
			}
			case PROJECT_MANAGER -> throw new UnauthorizedAccessException(
					"Project managers cannot view timesheets");
			case WORKER -> {
				Worker self = requireSelfWorker(actor);
				if (!timesheet.getWorker().getId().equals(self.getId())) {
					throw new UnauthorizedAccessException("You may only view your own timesheets");
				}
			}
		}
	}
}
