package com.hackathon.workday.timesheet;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TimesheetRepository extends JpaRepository<Timesheet, Long> {

	@EntityGraph(attributePaths = {"assignment", "assignment.team", "worker", "worker.user"})
	Optional<Timesheet> findWithDetailsById(Long id);

	/** Backs the pre-check for the UNIQUE(assignment_id, worker_id, week_start_date) key. */
	boolean existsByAssignmentIdAndWorkerIdAndWeekStartDate(
			Long assignmentId, Long workerId, LocalDate weekStartDate);

	/** A worker's own history, scoped in the query to their worker id directly. */
	@EntityGraph(attributePaths = {"assignment", "assignment.team", "worker", "worker.user"})
	Page<Timesheet> findByWorkerId(Long workerId, Pageable pageable);

	@EntityGraph(attributePaths = {"assignment", "assignment.team", "worker", "worker.user"})
	Page<Timesheet> findByWorkerIdAndStatus(Long workerId, TimesheetStatus status, Pageable pageable);

	/**
	 * Every timesheet across every team the manager owns. The manager filter is
	 * part of the query, which is what stops Manager A reading Manager B's data.
	 */
	@EntityGraph(attributePaths = {"assignment", "assignment.team", "worker", "worker.user"})
	@Query("SELECT t FROM Timesheet t WHERE t.assignment.team.manager.id = :managerId")
	Page<Timesheet> findByTeamManagerId(@Param("managerId") Long managerId, Pageable pageable);

	@EntityGraph(attributePaths = {"assignment", "assignment.team", "worker", "worker.user"})
	@Query("""
			SELECT t FROM Timesheet t
			WHERE t.assignment.team.manager.id = :managerId AND t.status = :status
			""")
	Page<Timesheet> findByTeamManagerIdAndStatus(
			@Param("managerId") Long managerId,
			@Param("status") TimesheetStatus status,
			Pageable pageable);

	@EntityGraph(attributePaths = {"assignment", "assignment.team", "worker", "worker.user"})
	@Query("SELECT t FROM Timesheet t WHERE t.assignment.team.organization.id = :organizationId")
	Page<Timesheet> findByOrganizationId(@Param("organizationId") Long organizationId, Pageable pageable);

	/** The billing input: every SUBMITTED timesheet across a contract's assignments. */
	@EntityGraph(attributePaths = {"assignment", "worker"})
	List<Timesheet> findByAssignmentIdInAndStatus(List<Long> assignmentIds, TimesheetStatus status);

	/**
	 * The Soft Cap Rule input: the team's total logged hours on one assignment
	 * so far, across every week that already counts toward the budget —
	 * SUBMITTED (billable) and NEEDS_REVIEW (awaiting a decision, but still
	 * logged) alike. A DRAFT week does not count; it is not finished yet.
	 */
	@Query("""
			SELECT COALESCE(SUM(t.totalHours), 0) FROM Timesheet t
			WHERE t.assignment.id = :assignmentId AND t.status IN :statuses
			""")
	BigDecimal sumHoursByAssignmentIdAndStatusIn(
			@Param("assignmentId") Long assignmentId,
			@Param("statuses") List<TimesheetStatus> statuses);

	/**
	 * The PDF export's line-item breakdown: every SUBMITTED (billable) timesheet
	 * across a contract's assignments whose week falls inside an invoice's
	 * billing period. Best-effort reconstruction — there is no persisted
	 * invoice/timesheet link (see MVP2's known limitation) — but it is exactly
	 * the same rule {@link com.hackathon.workday.invoice.InvoiceService} bills by.
	 */
	@EntityGraph(attributePaths = {"assignment", "worker", "worker.user"})
	@Query("""
			SELECT t FROM Timesheet t
			WHERE t.assignment.id IN :assignmentIds AND t.status = :status
			  AND t.weekStartDate >= :periodStart AND t.weekEndDate <= :periodEnd
			ORDER BY t.assignment.title, t.worker.user.name
			""")
	List<Timesheet> findBillableForInvoicePeriod(
			@Param("assignmentIds") List<Long> assignmentIds,
			@Param("status") TimesheetStatus status,
			@Param("periodStart") LocalDate periodStart,
			@Param("periodEnd") LocalDate periodEnd);

	@Query("""
			SELECT COUNT(t) FROM Timesheet t
			WHERE t.assignment.team.organization.id = :organizationId AND t.status = :status
			""")
	long countByOrganizationIdAndStatus(
			@Param("organizationId") Long organizationId,
			@Param("status") TimesheetStatus status);

	@Query("SELECT COUNT(t) FROM Timesheet t WHERE t.assignment.team.manager.id = :managerId AND t.status = :status")
	long countByTeamManagerIdAndStatus(
			@Param("managerId") Long managerId,
			@Param("status") TimesheetStatus status);

	long countByWorkerIdAndStatus(Long workerId, TimesheetStatus status);

	/** Sum of submitted hours, used for the worker's dashboard tile. */
	@Query("""
			SELECT COALESCE(SUM(t.totalHours), 0) FROM Timesheet t
			WHERE t.worker.id = :workerId AND t.status = :status
			""")
	java.math.BigDecimal sumHoursByWorkerIdAndStatus(
			@Param("workerId") Long workerId,
			@Param("status") TimesheetStatus status);
}
