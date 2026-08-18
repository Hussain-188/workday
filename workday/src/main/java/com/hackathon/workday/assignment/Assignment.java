package com.hackathon.workday.assignment;

import com.hackathon.workday.common.BaseEntity;
import com.hackathon.workday.common.exception.InvalidAssignmentException;
import com.hackathon.workday.contract.Contract;
import com.hackathon.workday.team.Team;
import com.hackathon.workday.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * A piece of billable work owned by a whole team, not a single worker: any
 * active worker on {@code team} may log hours against it via a
 * {@link com.hackathon.workday.timesheet.Timesheet}. This is the MVP 2
 * "Team Assignment" model — {@code team_id} is the sole ownership column,
 * there is deliberately no junction table between workers and assignments.
 *
 * <p>It is not a task. Finer-grained task management remains a later MVP.
 */
@Entity
@Table(name = "assignments")
public class Assignment extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "team_id", nullable = false)
	private Team team;

	/** The project this work bills against; drives Milestone Billing invoices. */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "contract_id", nullable = false)
	private Contract contract;

	/** The manager who created it, captured so ownership survives team changes. */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "manager_id", nullable = false)
	private User manager;

	@Column(nullable = false, length = 200)
	private String title;

	@Column(length = 2000)
	private String description;

	@Column(name = "start_date", nullable = false)
	private LocalDate startDate;

	@Column(name = "end_date")
	private LocalDate endDate;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private AssignmentStatus status = AssignmentStatus.ACTIVE;

	/**
	 * MVP 3: the manager's budget for this milestone, checked against the
	 * team's total logged hours by the Soft Cap Rule. Nullable — an assignment
	 * with no budget never triggers a review; every MVP 2 assignment predates
	 * this field and behaves exactly as before.
	 */
	@Column(name = "allocated_hours", precision = 6, scale = 2)
	private BigDecimal allocatedHours;

	protected Assignment() {
		// for JPA
	}

	public Assignment(Team team, Contract contract, User manager, String title, String description,
			LocalDate startDate, LocalDate endDate) {
		this.team = team;
		this.contract = contract;
		this.manager = manager;
		this.title = title;
		this.description = description;
		this.startDate = startDate;
		this.endDate = endDate;
		this.status = AssignmentStatus.ACTIVE;
	}

	public Assignment(Team team, Contract contract, User manager, String title, String description,
			LocalDate startDate, LocalDate endDate, BigDecimal allocatedHours) {
		this(team, contract, manager, title, description, startDate, endDate);
		setAllocatedHours(allocatedHours);
	}

	public boolean isActive() {
		return status == AssignmentStatus.ACTIVE;
	}

	/** True when the given user id owns the team this work belongs to. */
	public boolean isOwnedByManager(Long userId) {
		return manager.getId().equals(userId) || team.isManagedBy(userId);
	}

	public Team getTeam() {
		return team;
	}

	public Contract getContract() {
		return contract;
	}

	public User getManager() {
		return manager;
	}

	public String getTitle() {
		return title;
	}

	public String getDescription() {
		return description;
	}

	public LocalDate getStartDate() {
		return startDate;
	}

	public LocalDate getEndDate() {
		return endDate;
	}

	public AssignmentStatus getStatus() {
		return status;
	}

	public void setStatus(AssignmentStatus status) {
		this.status = status;
	}

	public BigDecimal getAllocatedHours() {
		return allocatedHours;
	}

	/** {@code null} clears the budget; a Soft Cap Rule check never fires without one. */
	public void setAllocatedHours(BigDecimal allocatedHours) {
		if (allocatedHours != null && allocatedHours.signum() <= 0) {
			throw new InvalidAssignmentException("allocatedHours must be positive when provided");
		}
		this.allocatedHours = allocatedHours == null ? null : allocatedHours.setScale(2, RoundingMode.HALF_UP);
	}
}
