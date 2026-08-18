package com.hackathon.workday.contract;

import com.hackathon.workday.contract.dto.ContractResponse;
import org.springframework.stereotype.Component;

@Component
public class ContractMapper {

	/** Expects the manager/createdByAdmin graph to be fetched; see the repository. */
	public ContractResponse toResponse(Contract contract) {
		return new ContractResponse(
				contract.getId(),
				contract.getProjectName(),
				contract.getStartDate(),
				contract.getEndDate(),
				contract.getDurationInMonths(),
				contract.getManager().getId(),
				contract.getManager().getName(),
				contract.getCreatedByAdmin().getId(),
				contract.getCreatedByAdmin().getName(),
				contract.getCreatedAt(),
				contract.getUpdatedAt());
	}
}
