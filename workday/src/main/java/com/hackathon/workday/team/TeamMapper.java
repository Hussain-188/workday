package com.hackathon.workday.team;

import com.hackathon.workday.team.dto.TeamResponse;
import org.springframework.stereotype.Component;

@Component
public class TeamMapper {

	/** Expects a team loaded with its manager; see the repository entity graphs. */
	public TeamResponse toResponse(Team team) {
		return new TeamResponse(
				team.getId(),
				team.getOrganization().getId(),
				team.getName(),
				team.getCode(),
				team.getDescription(),
				team.getManager().getId(),
				team.getManager().getName(),
				team.getManager().getEmail(),
				team.getStatus(),
				team.getCreatedAt(),
				team.getUpdatedAt());
	}
}
