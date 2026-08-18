package com.hackathon.workday.invoice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * The manager is deliberately absent: it is the authenticated caller, never
 * accepted as input.
 *
 * @param contractId the contract this invoice bills against; must be owned by
 *        the calling manager
 * @param projectManagerId a PROJECT_MANAGER-role user in the same
 *        organization; who this invoice will be routed to on submit
 */
public record CreateInvoiceRequest(
		@NotNull(message = "contractId is required")
		Long contractId,

		@NotNull(message = "projectManagerId is required")
		Long projectManagerId,

		@NotNull(message = "periodStart is required")
		LocalDate periodStart,

		@NotNull(message = "periodEnd is required")
		LocalDate periodEnd,

		@NotNull(message = "amount is required")
		@DecimalMin(value = "0.0", message = "amount must not be negative")
		BigDecimal amount,

		@Size(max = 1000, message = "notes must not exceed 1000 characters")
		String notes) {
}
