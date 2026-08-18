package com.hackathon.workday.team;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<Team, Long> {

	/**
	 * Admin-scoped listing. The entity graph pulls the manager in the same query
	 * so that mapping a page of teams does not fire one query per row.
	 */
	@EntityGraph(attributePaths = {"manager", "organization"})
	Page<Team> findByOrganizationId(Long organizationId, Pageable pageable);

	/** Manager-scoped listing: the database, not Java, applies the filter. */
	@EntityGraph(attributePaths = {"manager", "organization"})
	Page<Team> findByOrganizationIdAndManagerId(Long organizationId, Long managerId, Pageable pageable);

	@EntityGraph(attributePaths = {"manager", "organization"})
	Optional<Team> findWithManagerById(Long id);

	boolean existsByOrganizationIdAndCode(Long organizationId, String code);
}
