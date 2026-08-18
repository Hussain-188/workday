package com.hackathon.workday.contract;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ContractRepository extends JpaRepository<Contract, Long> {

	@EntityGraph(attributePaths = {"manager", "createdByAdmin"})
	Optional<Contract> findWithDetailsById(Long id);

	/**
	 * Organization-wide listing. Contracts carry no organization column of their
	 * own — the owning manager's organization is the tenancy boundary.
	 */
	@EntityGraph(attributePaths = {"manager", "createdByAdmin"})
	@Query("SELECT c FROM Contract c WHERE c.manager.organization.id = :organizationId")
	Page<Contract> findByOrganizationId(@Param("organizationId") Long organizationId, Pageable pageable);

	/** A manager's own contracts. */
	@EntityGraph(attributePaths = {"manager", "createdByAdmin"})
	Page<Contract> findByManagerId(Long managerId, Pageable pageable);

	@Query("SELECT COUNT(c) FROM Contract c WHERE c.manager.organization.id = :organizationId")
	long countByOrganizationId(@Param("organizationId") Long organizationId);
}
