package com.hackathon.workday.assignment;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

	@EntityGraph(attributePaths = {"team", "contract", "manager"})
	Optional<Assignment> findWithDetailsById(Long id);

	/** Everything on a worker's team — the MVP 2 team-ownership model. */
	@EntityGraph(attributePaths = {"team", "contract", "manager"})
	Page<Assignment> findByTeamId(Long teamId, Pageable pageable);

	@EntityGraph(attributePaths = {"team", "contract", "manager"})
	Page<Assignment> findByTeamIdAndStatus(Long teamId, AssignmentStatus status, Pageable pageable);

	/** Every assignment billed against a contract; the input to invoice generation. */
	@EntityGraph(attributePaths = {"team", "contract", "manager"})
	List<Assignment> findByContractId(Long contractId);

	/** Everything across every team this manager owns. */
	@EntityGraph(attributePaths = {"team", "contract", "manager"})
	@Query("SELECT a FROM Assignment a WHERE a.team.manager.id = :managerId")
	Page<Assignment> findByTeamManagerId(@Param("managerId") Long managerId, Pageable pageable);

	@EntityGraph(attributePaths = {"team", "contract", "manager"})
	@Query("SELECT a FROM Assignment a WHERE a.team.manager.id = :managerId AND a.status = :status")
	Page<Assignment> findByTeamManagerIdAndStatus(
			@Param("managerId") Long managerId,
			@Param("status") AssignmentStatus status,
			Pageable pageable);

	@EntityGraph(attributePaths = {"team", "contract", "manager"})
	@Query("SELECT a FROM Assignment a WHERE a.team.organization.id = :organizationId")
	Page<Assignment> findByOrganizationId(@Param("organizationId") Long organizationId, Pageable pageable);

	@EntityGraph(attributePaths = {"team", "contract", "manager"})
	@Query("""
			SELECT a FROM Assignment a
			WHERE a.team.organization.id = :organizationId AND a.status = :status
			""")
	Page<Assignment> findByOrganizationIdAndStatus(
			@Param("organizationId") Long organizationId,
			@Param("status") AssignmentStatus status,
			Pageable pageable);

	@Query("""
			SELECT COUNT(a) FROM Assignment a
			WHERE a.team.organization.id = :organizationId AND a.status = :status
			""")
	long countByOrganizationIdAndStatus(
			@Param("organizationId") Long organizationId,
			@Param("status") AssignmentStatus status);

	@Query("SELECT COUNT(a) FROM Assignment a WHERE a.team.manager.id = :managerId AND a.status = :status")
	long countByTeamManagerIdAndStatus(
			@Param("managerId") Long managerId,
			@Param("status") AssignmentStatus status);

	long countByTeamIdAndStatus(Long teamId, AssignmentStatus status);
}
