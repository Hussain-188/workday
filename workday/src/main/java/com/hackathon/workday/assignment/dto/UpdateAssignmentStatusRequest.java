package com.hackathon.workday.assignment.dto;

import com.hackathon.workday.assignment.AssignmentStatus;
import jakarta.validation.constraints.NotNull;

/**
 * @param projectManagerId MVP 3 Automated Handoff: only used when
 *        {@code status} is COMPLETED. When present, a Milestone Billing
 *        invoice is generated for the assignment's contract and routed to
 *        this project manager in the same call. Omitted (or no billable
 *        hours yet) — the status still changes, just without an invoice.
 */
public record UpdateAssignmentStatusRequest(
		@NotNull(message = "status is required")
		AssignmentStatus status,

		Long projectManagerId) {
}
