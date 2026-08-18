package com.hackathon.workday.assignment;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

	@EntityGraph(attributePaths = {"team", "worker", "worker.user", "manager"})
	Optional<Assignment> findWithDetailsById(Long id);

	@EntityGraph(attributePaths = {"team", "worker", "worker.user", "manager"})
	Page<Assignment> findByWorkerId(Long workerId, Pageable pageable);

	@EntityGraph(attributePaths = {"team", "worker", "worker.user", "manager"})
	Page<Assignment> findByWorkerIdAndStatus(Long workerId, AssignmentStatus status, Pageable pageable);

	/** Everything across every team this manager owns. */
	@EntityGraph(attributePaths = {"team", "worker", "worker.user", "manager"})
	@Query("SELECT a FROM Assignment a WHERE a.team.manager.id = :managerId")
	Page<Assignment> findByTeamManagerId(@Param("managerId") Long managerId, Pageable pageable);

	@EntityGraph(attributePaths = {"team", "worker", "worker.user", "manager"})
	@Query("SELECT a FROM Assignment a WHERE a.team.manager.id = :managerId AND a.status = :status")
	Page<Assignment> findByTeamManagerIdAndStatus(
			@Param("managerId") Long managerId,
			@Param("status") AssignmentStatus status,
			Pageable pageable);

	@EntityGraph(attributePaths = {"team", "worker", "worker.user", "manager"})
	@Query("SELECT a FROM Assignment a WHERE a.team.organization.id = :organizationId")
	Page<Assignment> findByOrganizationId(@Param("organizationId") Long organizationId, Pageable pageable);

	@EntityGraph(attributePaths = {"team", "worker", "worker.user", "manager"})
	@Query("""
			SELECT a FROM Assignment a
			WHERE a.team.organization.id = :organizationId AND a.status = :status
			""")
	Page<Assignment> findByOrganizationIdAndStatus(
			@Param("organizationId") Long organizationId,
			@Param("status") AssignmentStatus status,
			Pageable pageable);
}
