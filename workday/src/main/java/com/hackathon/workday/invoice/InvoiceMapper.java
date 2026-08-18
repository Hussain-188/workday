package com.hackathon.workday.invoice;

import com.hackathon.workday.invoice.dto.InvoiceResponse;
import org.springframework.stereotype.Component;

@Component
public class InvoiceMapper {

	/** Expects the contract/manager/projectManager graph to be fetched; see the repository. */
	public InvoiceResponse toResponse(Invoice invoice) {
		return new InvoiceResponse(
				invoice.getId(),
				invoice.getContract().getId(),
				invoice.getContract().getProjectName(),
				invoice.getManager().getId(),
				invoice.getManager().getName(),
				invoice.getProjectManager().getId(),
				invoice.getProjectManager().getName(),
				invoice.getPeriodStart(),
				invoice.getPeriodEnd(),
				invoice.getAmount(),
				invoice.getNotes(),
				invoice.getDecisionNotes(),
				invoice.getStatus(),
				invoice.getCreatedAt(),
				invoice.getUpdatedAt());
	}
}
