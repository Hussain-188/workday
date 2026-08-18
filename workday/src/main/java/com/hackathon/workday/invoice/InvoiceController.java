package com.hackathon.workday.invoice;

import com.hackathon.workday.common.response.PageResponse;
import com.hackathon.workday.invoice.dto.CreateInvoiceRequest;
import com.hackathon.workday.invoice.dto.InvoiceDecisionRequest;
import com.hackathon.workday.invoice.dto.InvoiceResponse;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

	private final InvoiceService invoiceService;

	public InvoiceController(InvoiceService invoiceService) {
		this.invoiceService = invoiceService;
	}

	/** Generates a DRAFT invoice against a contract the caller manages. */
	@PostMapping
	@PreAuthorize("hasRole('MANAGER')")
	public ResponseEntity<InvoiceResponse> createInvoice(
			@Valid @RequestBody CreateInvoiceRequest request,
			@AuthenticationPrincipal AuthPrincipal actor) {
		InvoiceResponse created = invoiceService.createInvoice(request, actor);
		return ResponseEntity.status(HttpStatus.CREATED).body(created);
	}

	/**
	 * Invoices visible to the caller: the whole organization for an admin or HR
	 * user, only invoices they raised for a manager, only invoices routed to
	 * them for a project manager.
	 */
	@GetMapping
	@PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'HR_MANAGER', 'MANAGER', 'PROJECT_MANAGER')")
	public PageResponse<InvoiceResponse> listInvoices(
			@RequestParam(required = false) InvoiceStatus status,
			@PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable,
			@AuthenticationPrincipal AuthPrincipal actor) {
		Page<InvoiceResponse> page = invoiceService.listInvoices(actor, status, pageable);
		return PageResponse.from(page, response -> response);
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'HR_MANAGER', 'MANAGER', 'PROJECT_MANAGER')")
	public InvoiceResponse getInvoice(
			@PathVariable Long id,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return invoiceService.getInvoice(id, actor);
	}

	/** Routes a DRAFT invoice to its assigned project manager. */
	@PostMapping("/{id}/submit")
	@PreAuthorize("hasRole('MANAGER')")
	public InvoiceResponse submitInvoice(
			@PathVariable Long id,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return invoiceService.submitInvoice(id, actor);
	}

	@PostMapping("/{id}/approve")
	@PreAuthorize("hasRole('PROJECT_MANAGER')")
	public InvoiceResponse approveInvoice(
			@PathVariable Long id,
			@RequestBody(required = false) @Valid InvoiceDecisionRequest request,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return invoiceService.approveInvoice(id, request, actor);
	}

	@PostMapping("/{id}/reject")
	@PreAuthorize("hasRole('PROJECT_MANAGER')")
	public InvoiceResponse rejectInvoice(
			@PathVariable Long id,
			@RequestBody(required = false) @Valid InvoiceDecisionRequest request,
			@AuthenticationPrincipal AuthPrincipal actor) {
		return invoiceService.rejectInvoice(id, request, actor);
	}
}
