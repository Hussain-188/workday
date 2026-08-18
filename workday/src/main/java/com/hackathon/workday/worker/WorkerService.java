package com.hackathon.workday.worker;

import com.hackathon.workday.common.audit.AuditAction;
import com.hackathon.workday.common.audit.AuditService;
import com.hackathon.workday.common.exception.DuplicateResourceException;
import com.hackathon.workday.common.exception.ForbiddenOperationException;
import com.hackathon.workday.common.exception.InvalidWorkerStateException;
import com.hackathon.workday.common.exception.ResourceNotFoundException;
import com.hackathon.workday.common.exception.UnauthorizedAccessException;
import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.organization.OrganizationRepository;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.team.Team;
import com.hackathon.workday.team.TeamRepository;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.user.UserRepository;
import com.hackathon.workday.worker.dto.CreateWorkerRequest;
import com.hackathon.workday.worker.dto.OffboardWorkerRequest;
import com.hackathon.workday.worker.dto.UpdateWorkerRequest;
import com.hackathon.workday.worker.dto.WorkerResponse;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Owns the worker lifecycle. Role checks happen at the controller; this class
 * owns the resource-level rules — which organization, which team, whose record.
 */
@Service
public class WorkerService {

	private static final String ENTITY = "Worker";

	private final WorkerRepository workerRepository;
	private final UserRepository userRepository;
	private final OrganizationRepository organizationRepository;
	private final TeamRepository teamRepository;
	private final PasswordEncoder passwordEncoder;
	private final AuditService auditService;
	private final WorkerMapper workerMapper;

	public WorkerService(WorkerRepository workerRepository, UserRepository userRepository,
			OrganizationRepository organizationRepository, TeamRepository teamRepository,
			PasswordEncoder passwordEncoder, AuditService auditService, WorkerMapper workerMapper) {
		this.workerRepository = workerRepository;
		this.userRepository = userRepository;
		this.organizationRepository = organizationRepository;
		this.teamRepository = teamRepository;
		this.passwordEncoder = passwordEncoder;
		this.auditService = auditService;
		this.workerMapper = workerMapper;
	}

	/**
	 * Creates the login identity and the employment record as one unit. Both
	 * inserts share a transaction, so a duplicate employee code cannot leave an
	 * orphaned User behind.
	 */
	@Transactional
	public WorkerResponse onboardWorker(CreateWorkerRequest request, AuthPrincipal actor) {
		if (userRepository.existsByEmailIgnoreCase(request.email())) {
			throw new DuplicateResourceException("A user already exists with email " + request.email());
		}
		if (workerRepository.existsByEmployeeCode(request.employeeCode())) {
			throw new DuplicateResourceException(
					"A worker already exists with employee code " + request.employeeCode());
		}

		Organization organization = organizationRepository.findById(actor.getOrganizationId())
				.orElseThrow(() -> new ResourceNotFoundException("Organization", actor.getOrganizationId()));

		User user = new User(
				organization,
				request.name(),
				request.email(),
				passwordEncoder.encode(request.password()),
				Role.WORKER);
		userRepository.save(user);

		Worker worker = new Worker(
				user,
				organization,
				request.employeeCode(),
				request.workerType(),
				request.employmentStartDate(),
				request.hourlyRate() != null ? request.hourlyRate() : java.math.BigDecimal.ZERO);

		if (request.teamId() != null) {
			worker.setTeam(resolveAssignableTeam(request.teamId(), actor));
		}
		workerRepository.save(worker);

		auditService.record(actor.getUserId(), AuditAction.WORKER_ONBOARDED, ENTITY, worker.getId(),
				"employeeCode=" + worker.getEmployeeCode() + ", type=" + worker.getWorkerType());

		return workerMapper.toResponse(worker);
	}

	/**
	 * Listing is scoped in the query, never filtered in memory: an admin sees
	 * their organization, a manager sees only workers on teams they manage.
	 */
	@Transactional(readOnly = true)
	public Page<WorkerResponse> listWorkers(AuthPrincipal actor, WorkerStatus status, Pageable pageable) {
		Page<Worker> workers = switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER -> status == null
					? workerRepository.findByOrganizationId(actor.getOrganizationId(), pageable)
					: workerRepository.findByOrganizationIdAndStatus(actor.getOrganizationId(), status, pageable);
			case MANAGER -> status == null
					? workerRepository.findByManagerId(actor.getUserId(), actor.getOrganizationId(), pageable)
					: workerRepository.findByManagerIdAndStatus(
							actor.getUserId(), actor.getOrganizationId(), status, pageable);
			case PROJECT_MANAGER -> throw new ForbiddenOperationException(
					"Project managers cannot list workers");
			case WORKER -> throw new ForbiddenOperationException(
					"Workers cannot list other workers; use /api/workers/me");
		};
		return workers.map(workerMapper::toResponse);
	}

	@Transactional(readOnly = true)
	public Page<WorkerResponse> listTeamWorkers(Long teamId, AuthPrincipal actor, Pageable pageable) {
		Team team = requireTeamInOrganization(teamId, actor);
		assertCanViewTeam(team, actor);
		return workerRepository.findByTeamId(team.getId(), pageable).map(workerMapper::toResponse);
	}

	@Transactional(readOnly = true)
	public WorkerResponse getWorker(Long workerId, AuthPrincipal actor) {
		Worker worker = requireWorker(workerId);
		assertSameOrganization(worker, actor);
		assertCanViewWorker(worker, actor);
		return workerMapper.toResponse(worker);
	}

	/** The authenticated worker's own record, derived from the JWT alone. */
	@Transactional(readOnly = true)
	public WorkerResponse getOwnProfile(AuthPrincipal actor) {
		Worker worker = workerRepository.findByUserId(actor.getUserId())
				.orElseThrow(() -> new ResourceNotFoundException(
						"No worker record exists for the authenticated user"));
		return workerMapper.toResponse(worker);
	}

	@Transactional
	public WorkerResponse updateWorker(Long workerId, UpdateWorkerRequest request, AuthPrincipal actor) {
		Worker worker = requireWorker(workerId);
		assertSameOrganization(worker, actor);

		if (worker.isOffboarded()) {
			throw new InvalidWorkerStateException("An offboarded worker's record cannot be modified");
		}

		if (request.name() != null) {
			worker.getUser().setName(request.name());
		}
		if (request.workerType() != null) {
			worker.setWorkerType(request.workerType());
		}
		if (request.employmentStartDate() != null) {
			worker.setEmploymentStartDate(request.employmentStartDate());
		}
		if (request.employmentEndDate() != null) {
			worker.setEmploymentEndDate(request.employmentEndDate());
		}
		if (request.hourlyRate() != null) {
			worker.setHourlyRate(request.hourlyRate());
		}
		if (request.teamId() != null) {
			worker.setTeam(resolveAssignableTeam(request.teamId(), actor));
		}
		if (request.status() != null) {
			applyStatusChange(worker, request.status());
		}

		// The end date may have moved either field; re-check the invariant once.
		if (worker.getEmploymentEndDate() != null
				&& worker.getEmploymentEndDate().isBefore(worker.getEmploymentStartDate())) {
			throw new InvalidWorkerStateException(
					"employmentEndDate must not precede employmentStartDate");
		}

		auditService.record(actor.getUserId(), AuditAction.WORKER_UPDATED, ENTITY, worker.getId());
		return workerMapper.toResponse(worker);
	}

	/**
	 * Ends the engagement without deleting anything. Assignments and timesheets
	 * survive; only the ability to receive new work is withdrawn.
	 */
	@Transactional
	public WorkerResponse offboardWorker(Long workerId, OffboardWorkerRequest request, AuthPrincipal actor) {
		Worker worker = requireWorker(workerId);
		assertSameOrganization(worker, actor);

		LocalDate effectiveDate = request != null && request.effectiveDate() != null
				? request.effectiveDate()
				: LocalDate.now();

		worker.offboard(effectiveDate);

		String reason = request != null ? request.reason() : null;
		auditService.record(actor.getUserId(), AuditAction.WORKER_OFFBOARDED, ENTITY, worker.getId(),
				"effectiveDate=" + effectiveDate + (reason != null ? ", reason=" + reason : ""));

		return workerMapper.toResponse(worker);
	}

	// ---------------------------------------------------------------- helpers

	private Worker requireWorker(Long workerId) {
		return workerRepository.findWithDetailsById(workerId)
				.orElseThrow(() -> new ResourceNotFoundException(ENTITY, workerId));
	}

	private void applyStatusChange(Worker worker, WorkerStatus target) {
		if (target == WorkerStatus.OFFBOARDED) {
			throw new InvalidWorkerStateException(
					"Use POST /api/workers/{id}/offboard to offboard a worker");
		}
		worker.setStatus(target);
	}

	/** A worker may only be placed on an ACTIVE team in their own organization. */
	private Team resolveAssignableTeam(Long teamId, AuthPrincipal actor) {
		Team team = requireTeamInOrganization(teamId, actor);
		if (!team.isActive()) {
			throw new InvalidWorkerStateException("Team " + teamId + " is not active");
		}
		return team;
	}

	private Team requireTeamInOrganization(Long teamId, AuthPrincipal actor) {
		Team team = teamRepository.findWithManagerById(teamId)
				.orElseThrow(() -> new ResourceNotFoundException("Team", teamId));
		if (!team.getOrganization().getId().equals(actor.getOrganizationId())) {
			throw new UnauthorizedAccessException("Team " + teamId + " belongs to another organization");
		}
		return team;
	}

	private void assertSameOrganization(Worker worker, AuthPrincipal actor) {
		if (!worker.getOrganization().getId().equals(actor.getOrganizationId())) {
			throw new UnauthorizedAccessException("This worker belongs to another organization");
		}
	}

	/**
	 * Role alone is not enough. An admin or HR manager sees the organization; a
	 * manager sees only their own team's workers; a worker sees only themselves.
	 */
	private void assertCanViewWorker(Worker worker, AuthPrincipal actor) {
		switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER -> {
				// organization-wide visibility, already checked above
			}
			case MANAGER -> {
				if (!workerRepository.isWorkerManagedBy(worker.getId(), actor.getUserId())) {
					throw new UnauthorizedAccessException("This worker is not on a team you manage");
				}
			}
			case PROJECT_MANAGER -> throw new UnauthorizedAccessException(
					"Project managers cannot view worker records");
			case WORKER -> {
				if (!worker.getUser().getId().equals(actor.getUserId())) {
					throw new UnauthorizedAccessException("You may only view your own worker record");
				}
			}
		}
	}

	private void assertCanViewTeam(Team team, AuthPrincipal actor) {
		switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER -> {
				// organization-wide visibility
			}
			case MANAGER -> {
				if (!team.isManagedBy(actor.getUserId())) {
					throw new UnauthorizedAccessException("You do not manage this team");
				}
			}
			case PROJECT_MANAGER -> throw new UnauthorizedAccessException("Project managers cannot view teams");
			case WORKER -> {
				Worker self = workerRepository.findByUserId(actor.getUserId())
						.orElseThrow(() -> new ResourceNotFoundException(
								"No worker record exists for the authenticated user"));
				if (self.getTeam() == null || !self.getTeam().getId().equals(team.getId())) {
					throw new UnauthorizedAccessException("You may only view your own team");
				}
			}
		}
	}
}
