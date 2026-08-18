package com.hackathon.workday.timesheet.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

/**
 * Opens a week against one assignment. There is no workerId: the worker is the
 * authenticated caller, and the assignment must already belong to them.
 *
 * @param weekStartDate must be a Monday; the end date is derived, not supplied
 * @param entries optional, so a week can be opened empty and filled in later
 */
public record CreateTimesheetRequest(
		@NotNull(message = "assignmentId is required")
		Long assignmentId,

		@NotNull(message = "weekStartDate is required")
		LocalDate weekStartDate,

		List<@Valid TimesheetEntryRequest> entries) {
}
