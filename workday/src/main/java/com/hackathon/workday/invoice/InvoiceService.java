package com.hackathon.workday.invoice;

import com.hackathon.workday.assignment.Assignment;
import com.hackathon.workday.assignment.AssignmentRepository;
import com.hackathon.workday.common.audit.AuditAction;
import com.hackathon.workday.common.audit.AuditService;
import com.hackathon.workday.common.exception.ForbiddenOperationException;
import com.hackathon.workday.common.exception.InvalidInvoiceStateException;
import com.hackathon.workday.common.exception.NoBillableTimesheetsException;
import com.hackathon.workday.common.exception.ResourceNotFoundException;
import com.hackathon.workday.common.exception.UnauthorizedAccessException;
import com.hackathon.workday.contract.Contract;
import com.hackathon.workday.contract.ContractService;
import com.hackathon.workday.invoice.dto.CreateInvoiceRequest;
import com.hackathon.workday.invoice.dto.InvoiceDecisionRequest;
import com.hackathon.workday.invoice.dto.InvoiceResponse;
import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.timesheet.Timesheet;
import com.hackathon.workday.timesheet.TimesheetRepository;
import com.hackathon.workday.timesheet.TimesheetStatus;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.user.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The manager-to-project-manager approval workflow: a manager raises an
 * invoice against a contract they own, submits it, and the assigned project
 * manager makes the one decision that closes it out.
 *
 * <p>Also owns Milestone Billing: computing a Time &amp; Materials invoice
 * amount straight from submitted timesheets, per {@link #generateInvoiceForContract}.
 */
@Service
public class InvoiceService {

	private static final String ENTITY = "Invoice";
	private static final int MONEY_SCALE = 2;

	private final InvoiceRepository invoiceRepository;
	private final AssignmentRepository assignmentRepository;
	private final TimesheetRepository timesheetRepository;
	private final UserRepository userRepository;
	private final ContractService contractService;
	private final AuditService auditService;
	private final InvoiceMapper invoiceMapper;
	private final InvoicePdfService invoicePdfService;

	public InvoiceService(InvoiceRepository invoiceRepository, AssignmentRepository assignmentRepository,
			TimesheetRepository timesheetRepository, UserRepository userRepository,
			ContractService contractService, AuditService auditService, InvoiceMapper invoiceMapper,
			InvoicePdfService invoicePdfService) {
		this.invoiceRepository = invoiceRepository;
		this.assignmentRepository = assignmentRepository;
		this.timesheetRepository = timesheetRepository;
		this.userRepository = userRepository;
		this.contractService = contractService;
		this.auditService = auditService;
		this.invoiceMapper = invoiceMapper;
		this.invoicePdfService = invoicePdfService;
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

	/**
	 * Milestone Billing (Time &amp; Materials): computes the invoice amount from
	 * every SUBMITTED timesheet logged against the contract's team-owned
	 * assignments — each timesheet's hours times the logging worker's own
	 * hourly rate, summed — and raises the invoice straight into
	 * PENDING_APPROVAL, ready for the project manager's decision.
	 *
	 * <p>Example: worker A logs 20h at $50/hr, worker B logs 10h at $75/hr
	 * &rarr; (20 &times; 50) + (10 &times; 75) = $1,750.00.
	 *
	 * @param contractId the contract being billed
	 * @param managerId the manager generating the invoice; must own the contract
	 * @param projectManagerId who must approve it; must hold PROJECT_MANAGER in
	 *        the contract's organization
	 */
	@Transactional
	public InvoiceResponse generateInvoiceForContract(Long contractId, Long managerId, Long projectManagerId) {
		Contract contract = contractService.requireOwnedContract(contractId, managerId);

		User manager = userRepository.findById(managerId)
				.orElseThrow(() -> new ResourceNotFoundException("User", managerId));

		User projectManager = userRepository.findByIdAndRole(projectManagerId, Role.PROJECT_MANAGER)
				.orElseThrow(() -> new ResourceNotFoundException("Project manager", projectManagerId));
		if (!projectManager.getOrganization().getId().equals(contract.getManager().getOrganization().getId())) {
			throw new UnauthorizedAccessException("That project manager belongs to another organization");
		}

		List<Assignment> assignments = assignmentRepository.findByContractId(contractId);
		if (assignments.isEmpty()) {
			throw new NoBillableTimesheetsException(
					"Contract " + contractId + " has no assignments to bill");
		}
		List<Long> assignmentIds = assignments.stream().map(Assignment::getId).toList();

		List<Timesheet> submitted =
				timesheetRepository.findByAssignmentIdInAndStatus(assignmentIds, TimesheetStatus.SUBMITTED);
		if (submitted.isEmpty()) {
			throw new NoBillableTimesheetsException(
					"No submitted timesheets were found to bill for contract " + contractId);
		}

		BigDecimal totalAmount = BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
		LocalDate periodStart = null;
		LocalDate periodEnd = null;
		for (Timesheet timesheet : submitted) {
			// Employee A (20h * $50) + Employee B (10h * $75) = $1,750, exactly —
			// BigDecimal throughout, never double/float, for billable money.
			// MVP 3: billableHours, not totalHours — a Soft Cap Rule week a
			// manager capped bills only the allocated_hours portion, never the
			// discarded overage.
			BigDecimal lineAmount = timesheet.getBillableHours()
					.multiply(timesheet.getWorker().getHourlyRate())
					.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
			totalAmount = totalAmount.add(lineAmount);

			if (periodStart == null || timesheet.getWeekStartDate().isBefore(periodStart)) {
				periodStart = timesheet.getWeekStartDate();
			}
			if (periodEnd == null || timesheet.getWeekEndDate().isAfter(periodEnd)) {
				periodEnd = timesheet.getWeekEndDate();
			}
		}

		Invoice invoice = new Invoice(contract, manager, projectManager, periodStart, periodEnd, totalAmount,
				"Auto-generated from " + submitted.size() + " submitted timesheet(s)");
		// Milestone Billing invoices are generated only once verification is
		// done, so they go straight to PENDING_APPROVAL rather than sitting in
		// DRAFT waiting for a separate manual submit.
		invoice.submit();
		invoiceRepository.save(invoice);

		auditService.record(managerId, AuditAction.INVOICE_CREATED, ENTITY, invoice.getId(),
				"contractId=" + contractId + ", auto-generated, timesheets=" + submitted.size());
		auditService.record(managerId, AuditAction.INVOICE_SUBMITTED, ENTITY, invoice.getId(),
				"projectManagerId=" + projectManager.getId());

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

	/** PDF export: same visibility rule as {@link #getInvoice}, rendered by {@link InvoicePdfService}. */
	@Transactional(readOnly = true)
	public byte[] generateInvoicePdf(Long invoiceId, AuthPrincipal actor) {
		Invoice invoice = requireInvoice(invoiceId);
		assertCanView(invoice, actor);
		return invoicePdfService.render(invoice);
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
