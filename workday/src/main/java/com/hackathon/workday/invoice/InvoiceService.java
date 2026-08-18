package com.hackathon.workday.invoice;

import com.hackathon.workday.common.audit.AuditAction;
import com.hackathon.workday.common.audit.AuditService;
import com.hackathon.workday.common.exception.ForbiddenOperationException;
import com.hackathon.workday.common.exception.InvalidInvoiceStateException;
import com.hackathon.workday.common.exception.ResourceNotFoundException;
import com.hackathon.workday.common.exception.UnauthorizedAccessException;
import com.hackathon.workday.contract.Contract;
import com.hackathon.workday.contract.ContractService;
import com.hackathon.workday.invoice.dto.CreateInvoiceRequest;
import com.hackathon.workday.invoice.dto.InvoiceDecisionRequest;
import com.hackathon.workday.invoice.dto.InvoiceResponse;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The manager-to-project-manager approval workflow: a manager raises an
 * invoice against a contract they own, submits it, and the assigned project
 * manager makes the one decision that closes it out.
 */
@Service
public class InvoiceService {

	private static final String ENTITY = "Invoice";

	private final InvoiceRepository invoiceRepository;
	private final UserRepository userRepository;
	private final ContractService contractService;
	private final AuditService auditService;
	private final InvoiceMapper invoiceMapper;

	public InvoiceService(InvoiceRepository invoiceRepository, UserRepository userRepository,
			ContractService contractService, AuditService auditService, InvoiceMapper invoiceMapper) {
		this.invoiceRepository = invoiceRepository;
		this.userRepository = userRepository;
		this.contractService = contractService;
		this.auditService = auditService;
		this.invoiceMapper = invoiceMapper;
	}

	/**
	 * Starts as DRAFT. The contract must be owned by the calling manager, and the
	 * project manager it is routed to must actually hold that role in the same
	 * organization — both checked here so a submit can never fail on them later.
	 */
	@Transactional
	public InvoiceResponse createInvoice(CreateInvoiceRequest request, AuthPrincipal actor) {
		Contract contract = contractService.requireContractInOrganization(request.contractId(), actor);
		if (!contract.isOwnedByManager(actor.getUserId())) {
			throw new UnauthorizedAccessException("You do not own this contract");
		}

		User manager = userRepository.findById(actor.getUserId())
				.orElseThrow(() -> new ResourceNotFoundException("User", actor.getUserId()));

		User projectManager = userRepository.findByIdAndRole(request.projectManagerId(), Role.PROJECT_MANAGER)
				.orElseThrow(() -> new ResourceNotFoundException("Project manager", request.projectManagerId()));
		if (!projectManager.getOrganization().getId().equals(actor.getOrganizationId())) {
			throw new UnauthorizedAccessException("That project manager belongs to another organization");
		}

		Invoice invoice = new Invoice(contract, manager, projectManager,
				request.periodStart(), request.periodEnd(), request.amount(), request.notes());
		invoiceRepository.save(invoice);

		auditService.record(actor.getUserId(), AuditAction.INVOICE_CREATED, ENTITY, invoice.getId(),
				"contractId=" + contract.getId() + ", projectManagerId=" + projectManager.getId());

		return invoiceMapper.toResponse(invoice);
	}

	/** Hands the invoice to the assigned project manager: DRAFT -&gt; PENDING_APPROVAL. */
	@Transactional
	public InvoiceResponse submitInvoice(Long invoiceId, AuthPrincipal actor) {
		Invoice invoice = requireOwnInvoice(invoiceId, actor);
		invoice.submit();

		auditService.record(actor.getUserId(), AuditAction.INVOICE_SUBMITTED, ENTITY, invoice.getId(),
				"projectManagerId=" + invoice.getProjectManager().getId());

		return invoiceMapper.toResponse(invoice);
	}

	/** PENDING_APPROVAL -&gt; APPROVED. Only the assigned project manager may decide. */
	@Transactional
	public InvoiceResponse approveInvoice(Long invoiceId, InvoiceDecisionRequest request, AuthPrincipal actor) {
		Invoice invoice = requireAssignedInvoice(invoiceId, actor);
		invoice.approve(request != null ? request.notes() : null);

		auditService.record(actor.getUserId(), AuditAction.INVOICE_APPROVED, ENTITY, invoice.getId());

		return invoiceMapper.toResponse(invoice);
	}

	/** PENDING_APPROVAL -&gt; REJECTED. A reason is required so the manager knows what to fix. */
	@Transactional
	public InvoiceResponse rejectInvoice(Long invoiceId, InvoiceDecisionRequest request, AuthPrincipal actor) {
		Invoice invoice = requireAssignedInvoice(invoiceId, actor);
		String reason = request != null ? request.notes() : null;
		if (reason == null || reason.isBlank()) {
			throw new InvalidInvoiceStateException("A reason is required to reject an invoice");
		}
		invoice.reject(reason);

		auditService.record(actor.getUserId(), AuditAction.INVOICE_REJECTED, ENTITY, invoice.getId(), reason);

		return invoiceMapper.toResponse(invoice);
	}

	/**
	 * Admin/HR see the organization; a manager sees invoices they raised; a
	 * project manager sees invoices routed to them.
	 */
	@Transactional(readOnly = true)
	public Page<InvoiceResponse> listInvoices(AuthPrincipal actor, InvoiceStatus status, Pageable pageable) {
		Page<Invoice> invoices = switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER -> status == null
					? invoiceRepository.findByOrganizationId(actor.getOrganizationId(), pageable)
					: invoiceRepository.findByOrganizationIdAndStatus(actor.getOrganizationId(), status, pageable);
			case MANAGER -> status == null
					? invoiceRepository.findByManagerId(actor.getUserId(), pageable)
					: invoiceRepository.findByManagerIdAndStatus(actor.getUserId(), status, pageable);
			case PROJECT_MANAGER -> status == null
					? invoiceRepository.findByProjectManagerId(actor.getUserId(), pageable)
					: invoiceRepository.findByProjectManagerIdAndStatus(actor.getUserId(), status, pageable);
			case WORKER -> throw new ForbiddenOperationException("Workers cannot list invoices");
		};
		return invoices.map(invoiceMapper::toResponse);
	}

	@Transactional(readOnly = true)
	public InvoiceResponse getInvoice(Long invoiceId, AuthPrincipal actor) {
		Invoice invoice = requireInvoice(invoiceId);
		assertCanView(invoice, actor);
		return invoiceMapper.toResponse(invoice);
	}

	// ---------------------------------------------------------------- helpers

	private Invoice requireInvoice(Long invoiceId) {
		return invoiceRepository.findWithDetailsById(invoiceId)
				.orElseThrow(() -> new ResourceNotFoundException(ENTITY, invoiceId));
	}

	/** Loads an invoice and proves the caller is the manager who raised it. */
	private Invoice requireOwnInvoice(Long invoiceId, AuthPrincipal actor) {
		Invoice invoice = requireInvoice(invoiceId);
		assertSameOrganization(invoice, actor);
		if (!invoice.isOwnedByManager(actor.getUserId())) {
			throw new UnauthorizedAccessException("This invoice does not belong to you");
		}
		return invoice;
	}

	/** Loads an invoice and proves the caller is the project manager it is assigned to. */
	private Invoice requireAssignedInvoice(Long invoiceId, AuthPrincipal actor) {
		Invoice invoice = requireInvoice(invoiceId);
		assertSameOrganization(invoice, actor);
		if (!invoice.isAssignedToProjectManager(actor.getUserId())) {
			throw new UnauthorizedAccessException("This invoice is not assigned to you");
		}
		return invoice;
	}

	private void assertSameOrganization(Invoice invoice, AuthPrincipal actor) {
		if (!invoice.getManager().getOrganization().getId().equals(actor.getOrganizationId())) {
			throw new UnauthorizedAccessException("This invoice belongs to another organization");
		}
	}

	private void assertCanView(Invoice invoice, AuthPrincipal actor) {
		assertSameOrganization(invoice, actor);
		switch (actor.getRole()) {
			case SYSTEM_ADMIN, HR_MANAGER -> {
				// organization-wide visibility
			}
			case MANAGER -> {
				if (!invoice.isOwnedByManager(actor.getUserId())) {
					throw new UnauthorizedAccessException("This invoice does not belong to you");
				}
			}
			case PROJECT_MANAGER -> {
				if (!invoice.isAssignedToProjectManager(actor.getUserId())) {
					throw new UnauthorizedAccessException("This invoice is not assigned to you");
				}
			}
			case WORKER -> throw new UnauthorizedAccessException("Workers cannot view invoices");
		}
	}
}
