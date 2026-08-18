package com.hackathon.workday.timesheet.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * Full replacement of the week's entries, matching the PUT verb: days absent
 * from the list are removed. There is no totalHours field — the server derives
 * it and would ignore a supplied value anyway.
 */
public record UpdateTimesheetEntriesRequest(
		@NotNull(message = "entries is required")
		List<@Valid TimesheetEntryRequest> entries) {
}
