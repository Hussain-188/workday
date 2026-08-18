package com.hackathon.workday.timesheet.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * One day's hours. Bean Validation catches the obvious range errors here; the
 * week-membership and duplicate-date rules need the timesheet's own week bounds
 * and are enforced by the aggregate.
 *
 * @param hours 0 to 24, at most two decimals, so 7.5 and 0.25 are both valid
 */
public record TimesheetEntryRequest(
		@NotNull(message = "workDate is required")
		LocalDate workDate,

		@NotNull(message = "hours is required")
		@DecimalMin(value = "0.0", message = "hours must not be negative")
		@DecimalMax(value = "24.0", message = "hours must not exceed 24")
		@Digits(integer = 2, fraction = 2, message = "hours allows at most two decimal places")
		BigDecimal hours,

		@Size(max = 500, message = "notes must not exceed 500 characters")
		String notes) {
}
