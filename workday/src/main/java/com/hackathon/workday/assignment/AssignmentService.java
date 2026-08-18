package com.hackathon.workday.assignment;

import com.hackathon.workday.assignment.dto.AssignmentResponse;
import com.hackathon.workday.assignment.dto.CreateAssignmentRequest;
import com.hackathon.workday.assignment.dto.UpdateAssignmentStatusRequest;
import com.hackathon.workday.common.audit.AuditAction;
import com.hackathon.workday.common.audit.AuditService;
import com.hackathon.workday.common.exception.ForbiddenOperationException;
import com.hackathon.workday.common.exception.InvalidAssignmentException;
import com.hackathon.workday.common.exception.ResourceNotFoundException;
import com.hackathon.workday.common.exception.UnauthorizedAccessException;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.team.Team;
import com.hackathon.workday.team.TeamService;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.user.UserRepository;
import com.hackathon.workday.worker.Worker;
import com.hackathon.workday.worker.WorkerRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssignmentService {

	private static final String ENTITY = "Assignment";

	private final AssignmentRepository assignmentRepository;
	private final WorkerRepository workerRepository;
	private final UserRepository userRepository;
	private final TeamService teamService;
	private final AuditService auditService;
	private final AssignmentMapper assignmentMapper;

	public AssignmentService(AssignmentRepository assignmentRepository, WorkerRepository workerRepository,
			UserRepository userRepository, TeamService teamService, AuditService auditService,
			AssignmentMapper assignmentMapper) {
		this.assignmentRepository = assignmentRepository;
		this.workerRepository = workerRepository;
		this.userRepository = userRepository;
		this.teamService = teamService;
		this.auditService = auditService;
		this.assignmentMapper = assignmentMapper;
	}

	/**
	 * Enforces every rule from the assignment invariants in one transaction:
	 * the team is in the caller's organization and active, the caller manages
	 * it, the worker is active and on that team, and the dates make sense.
	 */
	@Transactional
	public AssignmentResponse createAssignment(CreateAssignmentRequest request, AuthPrincipal actor) {
		if (request.endDate() != null && request.endDate().isBefore(request.startDate())) {
			throw new InvalidAssignmentException("endDate must not precede startDate");
		}

		Worker worker = workerRepository.findWithDetailsById(request.workerId())
				.orElseThrow(() -> new ResourceNotFoundException("Worker", request.workerId()));

		if (!worker.getOrganization().getId().equals(actor.getOrganizationId())) {
			throw new UnauthorizedAccessException("That worker belongs to another organization");
		}

		// teamId is optional: an omitted one means "the worker's own team". It is
		// resolved before the ownership checks, so a derived team is validated
		// exactly as strictly as an explicitly supplied one.
		Long targetTeamId = request.teamId() != null
				? request.teamId()
				: worker.getTeam() != null ? worker.getTeam().getId() : null;
		if (targetTeamId == null) {
			throw new InvalidAssignmentException(
					"Worker " + worker.getId() + " is not on a team, so teamId must be supplied");
		}

		Team team = teamService.requireTeam(targetTeamId, actor);
		if (!team.isActive()) {
			throw new InvalidAssignmentException("Team " + team.getId() + " is not active");
		}

		// A manager may only create work on a team they actually manage.
		if (actor.hasRole(Role.MANAGER) && !team.isManagedBy(actor.getUserId())) {
			throw new UnauthorizedAccessException("You do not manage this team");
		}
		// An offboarded or inactive worker cannot take on new work.
		if (!worker.isActive()) {
			throw new InvalidAssignmentException(
					"Worker " + worker.getId() + " is " + worker.getStatus() + " and cannot receive new assignments");
		}
		if (worker.getTeam() == null || !worker.getTeam().getId().equals(team.getId())) {
			throw new InvalidAssignmentException(
					"Worker " + worker.getId() + " does not belong to team " + team.getId());
		}

		// The owning manager is the team's manager, never a client-supplied id.
		User owningManager = actor.hasRole(Role.MANAGER)
				? userRepository.findById(actor.getUserId())
						.orElseThrow(() -> new ResourceNotFoundException("User", actor.getUserId()))
				: team.getManager();

		Assignment assignment = new Assignment(
				team, worker, owningManager,
				request.title(), request.description(),
				request.startDate(), request.endDate());
		assignmentRepository.save(assignment);

		auditService.record(actor.getUserId(), AuditAction.ASSIGNMENT_CREATED, ENTITY, assignment.getId(),
				"workerId=" + worker.getId() + ", teamId=" + team.getId());

		return assignmentMapper.toResponse(assignment);
	}

	@Transactional(readOnly = true)
	public Page<AssignmentResponse> listAssignments(AuthPrincipal actor, AssignmentStatus status, Pageable pageable) {
		Page<Assignment> assignments = switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER -> status == null
					? assignmentRepository.findByOrganizationId(actor.getOrganizationId(), pageable)
					: assignmentRepository.findByOrganizationIdAndStatus(actor.getOrganizationId(), status, pageable);
			case MANAGER -> status == null
					? assignmentRepository.findByTeamManagerId(actor.getUserId(), pageable)
					: assignmentRepository.findByTeamManagerIdAndStatus(actor.getUserId(), status, pageable);
			case PROJECT_MANAGER -> throw new ForbiddenOperationException(
					"Project managers cannot list assignments");
			case WORKER -> throw new ForbiddenOperationException(
					"Workers cannot list all assignments; use GET /api/assignments/my");
		};
		return assignments.map(assignmentMapper::toResponse);
	}

	/** The caller's own assignments, resolved from the token, not a parameter. */
	@Transactional(readOnly = true)
	public Page<AssignmentResponse> listOwnAssignments(AuthPrincipal actor, AssignmentStatus status, Pageable pageable) {
		Worker self = requireSelfWorker(actor);
		Page<Assignment> assignments = status == null
				? assignmentRepository.findByWorkerId(self.getId(), pageable)
				: assignmentRepository.findByWorkerIdAndStatus(self.getId(), status, pageable);
		return assignments.map(assignmentMapper::toResponse);
	}

	@Transactional(readOnly = true)
	public AssignmentResponse getAssignment(Long assignmentId, AuthPrincipal actor) {
		Assignment assignment = requireAssignment(assignmentId);
		assertCanView(assignment, actor);
		return assignmentMapper.toResponse(assignment);
	}

	/**
	 * Status is the only mutable field. Historical assignments stay readable in
	 * every state, so COMPLETED and CANCELLED are terminal only for new work.
	 */
	@Transactional
	public AssignmentResponse updateStatus(Long assignmentId, UpdateAssignmentStatusRequest request,
			AuthPrincipal actor) {
		Assignment assignment = requireAssignment(assignmentId);
		assertSameOrganization(assignment, actor);

		if (actor.hasRole(Role.MANAGER)
				&& !assignment.isOwnedByManager(actor.getUserId())) {
			throw new UnauthorizedAccessException("You do not manage the team this assignment belongs to");
		}

		AssignmentStatus previous = assignment.getStatus();
		if (previous == request.status()) {
			return assignmentMapper.toResponse(assignment);
		}
		if (previous != AssignmentStatus.ACTIVE) {
			throw new InvalidAssignmentException(
					"Assignment is " + previous + " and can no longer change status");
		}
		assignment.setStatus(request.status());

		auditService.record(actor.getUserId(), AuditAction.ASSIGNMENT_STATUS_CHANGED, ENTITY, assignment.getId(),
				previous + " -> " + request.status());

		return assignmentMapper.toResponse(assignment);
	}

	/**
	 * Shared with the timesheet module: loads an assignment and proves the
	 * caller is the worker it belongs to.
	 */
	@Transactional(readOnly = true)
	public Assignment requireOwnAssignment(Long assignmentId, AuthPrincipal actor) {
		Assignment assignment = requireAssignment(assignmentId);
		Worker self = requireSelfWorker(actor);
		if (!assignment.getWorker().getId().equals(self.getId())) {
			throw new UnauthorizedAccessException("This assignment does not belong to you");
		}
		return assignment;
	}

	// ---------------------------------------------------------------- helpers

	private Assignment requireAssignment(Long assignmentId) {
		return assignmentRepository.findWithDetailsById(assignmentId)
				.orElseThrow(() -> new ResourceNotFoundException(ENTITY, assignmentId));
	}

	private Worker requireSelfWorker(AuthPrincipal actor) {
		return workerRepository.findByUserId(actor.getUserId())
				.orElseThrow(() -> new ResourceNotFoundException(
						"No worker record exists for the authenticated user"));
	}

	private void assertSameOrganization(Assignment assignment, AuthPrincipal actor) {
		if (!assignment.getTeam().getOrganization().getId().equals(actor.getOrganizationId())) {
			throw new UnauthorizedAccessException("This assignment belongs to another organization");
		}
	}

	private void assertCanView(Assignment assignment, AuthPrincipal actor) {
		assertSameOrganization(assignment, actor);
		switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER -> {
				// organization-wide visibility
			}
			case MANAGER -> {
				if (!assignment.isOwnedByManager(actor.getUserId())) {
					throw new UnauthorizedAccessException("This assignment is not on a team you manage");
				}
			}
			case PROJECT_MANAGER -> throw new UnauthorizedAccessException(
					"Project managers cannot view assignments");
			case WORKER -> {
				Worker self = requireSelfWorker(actor);
				if (!assignment.getWorker().getId().equals(self.getId())) {
					throw new UnauthorizedAccessException("You may only view your own assignments");
				}
			}
		}
	}
}
