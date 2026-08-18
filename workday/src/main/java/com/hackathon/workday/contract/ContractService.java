package com.hackathon.workday.contract;

import com.hackathon.workday.common.audit.AuditAction;
import com.hackathon.workday.common.audit.AuditService;
import com.hackathon.workday.common.exception.ForbiddenOperationException;
import com.hackathon.workday.common.exception.InvalidContractException;
import com.hackathon.workday.common.exception.ResourceNotFoundException;
import com.hackathon.workday.common.exception.UnauthorizedAccessException;
import com.hackathon.workday.contract.dto.ContractResponse;
import com.hackathon.workday.contract.dto.CreateContractRequest;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Contract creation is an admin-only act: the admin picks the manager who will
 * own delivery, and the admin's own identity is captured as the creator.
 */
@Service
public class ContractService {

	private static final String ENTITY = "Contract";

	private final ContractRepository contractRepository;
	private final UserRepository userRepository;
	private final AuditService auditService;
	private final ContractMapper contractMapper;

	public ContractService(ContractRepository contractRepository, UserRepository userRepository,
			AuditService auditService, ContractMapper contractMapper) {
		this.contractRepository = contractRepository;
		this.userRepository = userRepository;
		this.auditService = auditService;
		this.contractMapper = contractMapper;
	}

	/**
	 * The caller (an admin) is captured as {@code createdByAdmin}, never accepted
	 * from the request. The manager must exist, hold the MANAGER role, and belong
	 * to the caller's organization.
	 */
	@Transactional
	public ContractResponse createContract(CreateContractRequest request, AuthPrincipal actor) {
		if (request.durationInMonths() <= 0) {
			throw new InvalidContractException("durationInMonths must be positive");
		}

		User manager = userRepository.findById(request.managerId())
				.orElseThrow(() -> new ResourceNotFoundException("Manager", request.managerId()));
		if (manager.getRole() != Role.MANAGER) {
			throw new InvalidContractException(
					"User " + request.managerId() + " is not a manager and cannot own a contract");
		}
		if (!manager.getOrganization().getId().equals(actor.getOrganizationId())) {
			throw new UnauthorizedAccessException("That manager belongs to another organization");
		}

		User createdByAdmin = userRepository.findById(actor.getUserId())
				.orElseThrow(() -> new ResourceNotFoundException("User", actor.getUserId()));

		Contract contract = new Contract(
				request.projectName(), request.startDate(), request.durationInMonths(), manager, createdByAdmin);
		contractRepository.save(contract);

		auditService.record(actor.getUserId(), AuditAction.CONTRACT_CREATED, ENTITY, contract.getId(),
				"managerId=" + manager.getId());

		return contractMapper.toResponse(contract);
	}

	/**
	 * Admin and HR see every contract in the organization; a manager sees only
	 * the contracts assigned to them. Project managers and workers do not browse
	 * contracts directly — a project manager reaches one through an invoice.
	 */
	@Transactional(readOnly = true)
	public Page<ContractResponse> listContracts(AuthPrincipal actor, Pageable pageable) {
		Page<Contract> contracts = switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER -> contractRepository.findByOrganizationId(actor.getOrganizationId(), pageable);
			case MANAGER -> contractRepository.findByManagerId(actor.getUserId(), pageable);
			case PROJECT_MANAGER -> throw new ForbiddenOperationException(
					"Project managers do not browse contracts directly; view them through an invoice");
			case WORKER -> throw new ForbiddenOperationException("Workers cannot list contracts");
		};
		return contracts.map(contractMapper::toResponse);
	}

	@Transactional(readOnly = true)
	public ContractResponse getContract(Long contractId, AuthPrincipal actor) {
		Contract contract = requireContract(contractId);
		assertCanView(contract, actor);
		return contractMapper.toResponse(contract);
	}

	/** Shared with the invoice module: loads a contract inside the caller's organization. */
	@Transactional(readOnly = true)
	public Contract requireContractInOrganization(Long contractId, AuthPrincipal actor) {
		Contract contract = requireContract(contractId);
		assertSameOrganization(contract, actor);
		return contract;
	}

	/**
	 * Loads a contract and proves the given user owns it. Used by Milestone
	 * Billing generation, which runs from raw ids rather than a request-scoped
	 * {@link AuthPrincipal}.
	 */
	@Transactional(readOnly = true)
	public Contract requireOwnedContract(Long contractId, Long managerId) {
		Contract contract = requireContract(contractId);
		if (!contract.isOwnedByManager(managerId)) {
			throw new UnauthorizedAccessException("You do not own this contract");
		}
		return contract;
	}

	// ---------------------------------------------------------------- helpers

	private Contract requireContract(Long contractId) {
		return contractRepository.findWithDetailsById(contractId)
				.orElseThrow(() -> new ResourceNotFoundException(ENTITY, contractId));
	}

	private void assertSameOrganization(Contract contract, AuthPrincipal actor) {
		if (!contract.getManager().getOrganization().getId().equals(actor.getOrganizationId())) {
			throw new UnauthorizedAccessException("This contract belongs to another organization");
		}
	}

	private void assertCanView(Contract contract, AuthPrincipal actor) {
		assertSameOrganization(contract, actor);
		switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER -> {
				// organization-wide visibility
			}
			case MANAGER -> {
				if (!contract.isOwnedByManager(actor.getUserId())) {
					throw new UnauthorizedAccessException("You do not own this contract");
				}
			}
			case PROJECT_MANAGER -> throw new UnauthorizedAccessException(
					"Project managers cannot browse contracts directly; the invoice they approve carries a summary");
			case WORKER -> throw new UnauthorizedAccessException("Workers cannot view contracts");
		}
	}
}
