package com.hackathon.workday.assignment;

import com.hackathon.workday.assignment.dto.AssignmentResponse;
import org.springframework.stereotype.Component;

@Component
public class AssignmentMapper {

	/** Expects the team/contract/manager graph to be fetched; see the repository. */
	public AssignmentResponse toResponse(Assignment assignment) {
		return new AssignmentResponse(
				assignment.getId(),
				assignment.getTeam().getId(),
				assignment.getTeam().getName(),
				assignment.getContract().getId(),
				assignment.getContract().getProjectName(),
				assignment.getManager().getId(),
				assignment.getManager().getName(),
				assignment.getTitle(),
				assignment.getDescription(),
				assignment.getStartDate(),
				assignment.getEndDate(),
				assignment.getStatus(),
				assignment.getAllocatedHours(),
				assignment.getCreatedAt(),
				assignment.getUpdatedAt());
	}
}
