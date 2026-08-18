package com.hackathon.workday.assignment.dto;

import com.hackathon.workday.assignment.AssignmentStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateAssignmentStatusRequest(
		@NotNull(message = "status is required")
		AssignmentStatus status) {
}
