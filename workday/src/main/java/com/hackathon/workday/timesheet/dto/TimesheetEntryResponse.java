package com.hackathon.workday.timesheet.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TimesheetEntryResponse(
		Long id,
		LocalDate workDate,
		BigDecimal hours,
		String notes) {
}
