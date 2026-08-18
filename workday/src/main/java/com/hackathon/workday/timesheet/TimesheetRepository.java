package com.hackathon.workday.timesheet;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TimesheetRepository extends JpaRepository<Timesheet, Long> {

	@EntityGraph(attributePaths = {"assignment", "assignment.worker", "assignment.worker.user", "assignment.team"})
	Optional<Timesheet> findWithDetailsById(Long id);

	/** Backs the pre-check for the UNIQUE(assignment_id, week_start_date) key. */
	boolean existsByAssignmentIdAndWeekStartDate(Long assignmentId, LocalDate weekStartDate);

	/** A worker's own history, scoped in the query to their worker id. */
	@EntityGraph(attributePaths = {"assignment", "assignment.worker", "assignment.worker.user", "assignment.team"})
	@Query("SELECT t FROM Timesheet t WHERE t.assignment.worker.id = :workerId")
	Page<Timesheet> findByWorkerId(@Param("workerId") Long workerId, Pageable pageable);

	@EntityGraph(attributePaths = {"assignment", "assignment.worker", "assignment.worker.user", "assignment.team"})
	@Query("SELECT t FROM Timesheet t WHERE t.assignment.worker.id = :workerId AND t.status = :status")
	Page<Timesheet> findByWorkerIdAndStatus(
			@Param("workerId") Long workerId,
			@Param("status") TimesheetStatus status,
			Pageable pageable);

	/**
	 * Every timesheet across every team the manager owns. The manager filter is
	 * part of the query, which is what stops Manager A reading Manager B's data.
	 */
	@EntityGraph(attributePaths = {"assignment", "assignment.worker", "assignment.worker.user", "assignment.team"})
	@Query("SELECT t FROM Timesheet t WHERE t.assignment.team.manager.id = :managerId")
	Page<Timesheet> findByTeamManagerId(@Param("managerId") Long managerId, Pageable pageable);

	@EntityGraph(attributePaths = {"assignment", "assignment.worker", "assignment.worker.user", "assignment.team"})
	@Query("""
			SELECT t FROM Timesheet t
			WHERE t.assignment.team.manager.id = :managerId AND t.status = :status
			""")
	Page<Timesheet> findByTeamManagerIdAndStatus(
			@Param("managerId") Long managerId,
			@Param("status") TimesheetStatus status,
			Pageable pageable);

	@EntityGraph(attributePaths = {"assignment", "assignment.worker", "assignment.worker.user", "assignment.team"})
	@Query("SELECT t FROM Timesheet t WHERE t.assignment.team.organization.id = :organizationId")
	Page<Timesheet> findByOrganizationId(@Param("organizationId") Long organizationId, Pageable pageable);
}
