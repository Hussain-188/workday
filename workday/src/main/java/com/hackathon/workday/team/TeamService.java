package com.hackathon.workday.team;

import com.hackathon.workday.common.audit.AuditAction;
import com.hackathon.workday.common.audit.AuditService;
import com.hackathon.workday.common.exception.DuplicateResourceException;
import com.hackathon.workday.common.exception.ForbiddenOperationException;
import com.hackathon.workday.common.exception.ResourceNotFoundException;
import com.hackathon.workday.common.exception.UnauthorizedAccessException;
import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.organization.OrganizationRepository;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.team.dto.CreateTeamRequest;
import com.hackathon.workday.team.dto.TeamResponse;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.user.UserRepository;
import com.hackathon.workday.worker.Worker;
import com.hackathon.workday.worker.WorkerRepository;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeamService {

	private static final String ENTITY = "Team";

	private final TeamRepository teamRepository;
	private final UserRepository userRepository;
	private final OrganizationRepository organizationRepository;
	private final WorkerRepository workerRepository;
	private final AuditService auditService;
	private final TeamMapper teamMapper;

	public TeamService(TeamRepository teamRepository, UserRepository userRepository,
			OrganizationRepository organizationRepository, WorkerRepository workerRepository,
			AuditService auditService, TeamMapper teamMapper) {
		this.teamRepository = teamRepository;
		this.userRepository = userRepository;
		this.organizationRepository = organizationRepository;
		this.workerRepository = workerRepository;
		this.auditService = auditService;
		this.teamMapper = teamMapper;
	}

	@Transactional
	public TeamResponse createTeam(CreateTeamRequest request, AuthPrincipal actor) {
		String code = resolveCode(request, actor.getOrganizationId());
		if (teamRepository.existsByOrganizationIdAndCode(actor.getOrganizationId(), code)) {
			throw new DuplicateResourceException(
					"A team already exists with code " + code + " in this organization");
		}

		Organization organization = organizationRepository.findById(actor.getOrganizationId())
				.orElseThrow(() -> new ResourceNotFoundException("Organization", actor.getOrganizationId()));

		// A team can only be owned by a MANAGER-role user in the same organization.
		User manager = userRepository.findById(request.managerId())
				.orElseThrow(() -> new ResourceNotFoundException("Manager", request.managerId()));
		if (manager.getRole() != Role.MANAGER) {
			throw new ForbiddenOperationException(
					"User " + request.managerId() + " is not a manager and cannot own a team");
		}
		if (!manager.getOrganization().getId().equals(actor.getOrganizationId())) {
			throw new UnauthorizedAccessException("That manager belongs to another organization");
		}

		Team team = new Team(organization, request.name(), code, request.description(), manager);
		teamRepository.save(team);

		auditService.record(actor.getUserId(), AuditAction.TEAM_CREATED, ENTITY, team.getId(),
				"code=" + team.getCode() + ", managerId=" + manager.getId());

		return teamMapper.toResponse(team);
	}

	/**
	 * Uses the supplied code, or derives a slug from the team name when the
	 * client omits it. A numeric suffix is appended if the slug is taken, so a
	 * form that only asks for a name can never collide.
	 */
	private String resolveCode(CreateTeamRequest request, Long organizationId) {
		if (request.code() != null && !request.code().isBlank()) {
			return request.code().trim();
		}

		String base = request.name().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "-")
				.replaceAll("(^-|-$)", "");
		if (base.isBlank()) {
			base = "TEAM";
		}
		base = base.substring(0, Math.min(base.length(), 40));

		String candidate = base;
		int suffix = 2;
		while (teamRepository.existsByOrganizationIdAndCode(organizationId, candidate)) {
			candidate = base + "-" + suffix++;
		}
		return candidate;
	}

	/** A manager's listing is narrowed by the query, not after loading. */
	@Transactional(readOnly = true)
	public Page<TeamResponse> listTeams(AuthPrincipal actor, Pageable pageable) {
		Page<Team> teams = switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER ->
					teamRepository.findByOrganizationId(actor.getOrganizationId(), pageable);
			case MANAGER -> teamRepository.findByOrganizationIdAndManagerId(
					actor.getOrganizationId(), actor.getUserId(), pageable);
			case WORKER -> throw new ForbiddenOperationException(
					"Workers cannot list teams; use GET /api/teams/{id} for your own team");
		};
		return teams.map(teamMapper::toResponse);
	}

	@Transactional(readOnly = true)
	public TeamResponse getTeam(Long teamId, AuthPrincipal actor) {
		Team team = requireTeam(teamId, actor);
		assertCanViewTeam(team, actor);
		return teamMapper.toResponse(team);
	}

	/**
	 * Loads a team and confirms it is inside the caller's organization. Shared
	 * with the assignment module, which needs the same guarantee.
	 */
	@Transactional(readOnly = true)
	public Team requireTeam(Long teamId, AuthPrincipal actor) {
		Team team = teamRepository.findWithManagerById(teamId)
				.orElseThrow(() -> new ResourceNotFoundException(ENTITY, teamId));
		if (!team.getOrganization().getId().equals(actor.getOrganizationId())) {
			throw new UnauthorizedAccessException("Team " + teamId + " belongs to another organization");
		}
		return team;
	}

	/**
	 * Managers see only teams they own; a worker sees only the team they are on.
	 * This is the rule that stops Manager A reading Manager B's team.
	 */
	public void assertCanViewTeam(Team team, AuthPrincipal actor) {
		switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER -> {
				// organization-wide visibility
			}
			case MANAGER -> {
				if (!team.isManagedBy(actor.getUserId())) {
					throw new UnauthorizedAccessException("You do not manage this team");
				}
			}
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
