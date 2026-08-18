package com.hackathon.workday.worker;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Every listing method is scoped in the query itself. Loading an organization's
 * workers and filtering them in Java would be both a security hazard and
 * unworkable at thousands of rows.
 */
public interface WorkerRepository extends JpaRepository<Worker, Long> {

	@EntityGraph(attributePaths = {"user", "team", "organization"})
	Optional<Worker> findWithDetailsById(Long id);

	/** Resolves the authenticated user to their employment record. */
	@EntityGraph(attributePaths = {"user", "team", "organization"})
	Optional<Worker> findByUserId(Long userId);

	Optional<Worker> findByEmployeeCode(String employeeCode);

	boolean existsByEmployeeCode(String employeeCode);

	@EntityGraph(attributePaths = {"user", "team", "organization"})
	Page<Worker> findByOrganizationId(Long organizationId, Pageable pageable);

	@EntityGraph(attributePaths = {"user", "team", "organization"})
	Page<Worker> findByOrganizationIdAndStatus(Long organizationId, WorkerStatus status, Pageable pageable);

	@EntityGraph(attributePaths = {"user", "team", "organization"})
	Page<Worker> findByTeamId(Long teamId, Pageable pageable);

	/** All workers across every team the given manager owns. */
	@EntityGraph(attributePaths = {"user", "team", "organization"})
	@Query("""
			SELECT w FROM Worker w
			WHERE w.team.manager.id = :managerId
			  AND w.organization.id = :organizationId
			""")
	Page<Worker> findByManagerId(
			@Param("managerId") Long managerId,
			@Param("organizationId") Long organizationId,
			Pageable pageable);

	@EntityGraph(attributePaths = {"user", "team", "organization"})
	@Query("""
			SELECT w FROM Worker w
			WHERE w.team.manager.id = :managerId
			  AND w.organization.id = :organizationId
			  AND w.status = :status
			""")
	Page<Worker> findByManagerIdAndStatus(
			@Param("managerId") Long managerId,
			@Param("organizationId") Long organizationId,
			@Param("status") WorkerStatus status,
			Pageable pageable);

	/** Ownership check for manager-scoped reads, answered by the database. */
	@Query("""
			SELECT COUNT(w) > 0 FROM Worker w
			WHERE w.id = :workerId AND w.team.manager.id = :managerId
			""")
	boolean isWorkerManagedBy(@Param("workerId") Long workerId, @Param("managerId") Long managerId);
}
