package com.hackathon.workday.timesheet.dto;

import jakarta.validation.constraints.NotNull;

/**
 * MVP 3 Soft Cap Rule: the manager's decision on a NEEDS_REVIEW timesheet.
 *
 * @param approveOverage {@code true} bills every logged hour ("Approve Total
 *        Time"); {@code false} discards the overage and caps billable hours
 *        at the assignment's {@code allocated_hours} budget ("Approve
 *        Allocated Time Only")
 */
public record ReviewTimesheetRequest(
		@NotNull(message = "approveOverage is required")
		Boolean approveOverage) {
}
