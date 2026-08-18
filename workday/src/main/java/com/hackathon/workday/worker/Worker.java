package com.hackathon.workday.worker;

import com.hackathon.workday.common.BaseEntity;
import com.hackathon.workday.common.exception.InvalidWorkerStateException;
import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.team.Team;
import com.hackathon.workday.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

/**
 * The employment record behind a WORKER-role {@link User}. Identity fields
 * (name, email, password) live on User and are never duplicated here.
 *
 * <p>MVP 1 gives a worker one primary team. Should multiple concurrent teams be
 * needed later, this field becomes a join table without changing the API shape.
 */
@Entity
@Table(name = "workers")
public class Worker extends BaseEntity {

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false, unique = true)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "organization_id", nullable = false)
	private Organization organization;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "team_id")
	private Team team;

	@Column(name = "employee_code", nullable = false, length = 50, unique = true)
	private String employeeCode;

	@Enumerated(EnumType.STRING)
	@Column(name = "worker_type", nullable = false, length = 30)
	private WorkerType workerType;

	@Column(name = "employment_start_date", nullable = false)
	private LocalDate employmentStartDate;

	@Column(name = "employment_end_date")
	private LocalDate employmentEndDate;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private WorkerStatus status = WorkerStatus.ACTIVE;

	protected Worker() {
		// for JPA
	}

	public Worker(User user, Organization organization, String employeeCode,
			WorkerType workerType, LocalDate employmentStartDate) {
		this.user = user;
		this.organization = organization;
		this.employeeCode = employeeCode;
		this.workerType = workerType;
		this.employmentStartDate = employmentStartDate;
		this.status = WorkerStatus.ACTIVE;
	}

	/**
	 * Ends the engagement. Historical assignments and timesheets are untouched
	 * by design; only the ability to receive new work is withdrawn.
	 */
	public void offboard(LocalDate endDate) {
		if (status == WorkerStatus.OFFBOARDED) {
			throw new InvalidWorkerStateException("Worker is already offboarded");
		}
		if (endDate.isBefore(employmentStartDate)) {
			throw new InvalidWorkerStateException(
					"employmentEndDate must not precede employmentStartDate");
		}
		this.status = WorkerStatus.OFFBOARDED;
		this.employmentEndDate = endDate;
	}

	/** Only an ACTIVE worker may receive assignments or open new timesheets. */
	public boolean isActive() {
		return status == WorkerStatus.ACTIVE;
	}

	public boolean isOffboarded() {
		return status == WorkerStatus.OFFBOARDED;
	}

	public User getUser() {
		return user;
	}

	public Organization getOrganization() {
		return organization;
	}

	public Team getTeam() {
		return team;
	}

	public void setTeam(Team team) {
		this.team = team;
	}

	public String getEmployeeCode() {
		return employeeCode;
	}

	public WorkerType getWorkerType() {
		return workerType;
	}

	public void setWorkerType(WorkerType workerType) {
		this.workerType = workerType;
	}

	public LocalDate getEmploymentStartDate() {
		return employmentStartDate;
	}

	public void setEmploymentStartDate(LocalDate employmentStartDate) {
		this.employmentStartDate = employmentStartDate;
	}

	public LocalDate getEmploymentEndDate() {
		return employmentEndDate;
	}

	public void setEmploymentEndDate(LocalDate employmentEndDate) {
		this.employmentEndDate = employmentEndDate;
	}

	public WorkerStatus getStatus() {
		return status;
	}

	public void setStatus(WorkerStatus status) {
		this.status = status;
	}
}
