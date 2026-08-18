package com.hackathon.workday.timesheet;

import com.hackathon.workday.assignment.Assignment;
import com.hackathon.workday.timesheet.dto.TimesheetEntryRequest;
import com.hackathon.workday.timesheet.dto.TimesheetEntryResponse;
import com.hackathon.workday.timesheet.dto.TimesheetResponse;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class TimesheetMapper {

	public TimesheetResponse toResponse(Timesheet timesheet) {
		Assignment assignment = timesheet.getAssignment();

		// Chronological order, so the frontend can render Monday-to-Sunday directly.
		List<TimesheetEntryResponse> entries = timesheet.getEntries().stream()
				.sorted(Comparator.comparing(TimesheetEntry::getWorkDate))
				.map(entry -> new TimesheetEntryResponse(
						entry.getId(), entry.getWorkDate(), entry.getHours(), entry.getNotes()))
				.toList();

		return new TimesheetResponse(
				timesheet.getId(),
				assignment.getId(),
				assignment.getTitle(),
				assignment.getWorker().getId(),
				assignment.getWorker().getUser().getName(),
				assignment.getTeam().getId(),
				assignment.getTeam().getName(),
				timesheet.getWeekStartDate(),
				timesheet.getWeekEndDate(),
				timesheet.getTotalHours(),
				timesheet.getStatus(),
				entries,
				timesheet.getVersion(),
				timesheet.getCreatedAt(),
				timesheet.getUpdatedAt());
	}

	/** Request rows become detached entities; the aggregate attaches them. */
	public List<TimesheetEntry> toEntities(List<TimesheetEntryRequest> requests) {
		if (requests == null) {
			return List.of();
		}
		return requests.stream()
				.map(request -> new TimesheetEntry(request.workDate(), request.hours(), request.notes()))
				.toList();
	}
}
