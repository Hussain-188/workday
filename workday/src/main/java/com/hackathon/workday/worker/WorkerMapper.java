package com.hackathon.workday.worker;

import com.hackathon.workday.team.Team;
import com.hackathon.workday.worker.dto.WorkerResponse;
import org.springframework.stereotype.Component;

/**
 * Entities never leave the service layer. Callers must supply workers loaded
 * with their user/team graph, otherwise this would trigger a query per row.
 */
@Component
public class WorkerMapper {

	public WorkerResponse toResponse(Worker worker) {
		Team team = worker.getTeam();
		return new WorkerResponse(
				worker.getId(),
				worker.getUser().getId(),
				worker.getUser().getName(),
				worker.getUser().getEmail(),
				worker.getEmployeeCode(),
				worker.getWorkerType(),
				worker.getEmploymentStartDate(),
				worker.getEmploymentEndDate(),
				worker.getStatus(),
				team != null ? team.getId() : null,
				team != null ? team.getName() : null,
				worker.getOrganization().getId(),
				worker.getCreatedAt(),
				worker.getUpdatedAt());
	}
}
