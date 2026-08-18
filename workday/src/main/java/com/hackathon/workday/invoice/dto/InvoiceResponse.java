package com.hackathon.workday.invoice.dto;

import com.hackathon.workday.invoice.InvoiceStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record InvoiceResponse(
		Long id,
		Long contractId,
		String contractProjectName,
		Long managerId,
		String managerName,
		Long projectManagerId,
		String projectManagerName,
		LocalDate periodStart,
		LocalDate periodEnd,
		BigDecimal amount,
		String notes,
		String decisionNotes,
		InvoiceStatus status,
		Instant createdAt,
		Instant updatedAt) {
}
