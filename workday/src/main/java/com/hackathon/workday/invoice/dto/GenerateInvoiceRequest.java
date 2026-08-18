package com.hackathon.workday.invoice.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Milestone Billing: the manager is deliberately absent — it is the
 * authenticated caller, never accepted as input. The amount is not supplied
 * either; it is computed from submitted timesheets.
 *
 * @param contractId the contract to bill; must be owned by the caller
 * @param projectManagerId a PROJECT_MANAGER-role user in the same
 *        organization; who this invoice will be routed to for approval
 */
public record GenerateInvoiceRequest(
		@NotNull(message = "contractId is required")
		Long contractId,

		@NotNull(message = "projectManagerId is required")
		Long projectManagerId) {
}
