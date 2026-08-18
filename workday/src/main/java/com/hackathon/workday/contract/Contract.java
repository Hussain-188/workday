package com.hackathon.workday.contract;

import com.hackathon.workday.common.BaseEntity;
import com.hackathon.workday.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

/**
 * The project a set of workers is engaged to deliver. An admin creates the
 * contract and assigns the manager who will own it; timesheets are verified
 * and invoiced against the work it represents.
 */
@Entity
@Table(name = "contracts")
public class Contract extends BaseEntity {

	@Column(name = "project_name", nullable = false, length = 200)
	private String projectName;

	@Column(name = "start_time", nullable = false)
	private LocalDate startDate;

	@Column(name = "duration_in_months", nullable = false)
	private Integer durationInMonths;

	/** The manager who owns delivery of this contract. */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "manager_id", nullable = false)
	private User manager;

	/** Captured at creation time; never changes even if the admin's own role does. */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "created_by_admin_id", nullable = false)
	private User createdByAdmin;

	protected Contract() {
		// for JPA
	}

	public Contract(String projectName, LocalDate startDate, Integer durationInMonths,
			User manager, User createdByAdmin) {
		this.projectName = projectName;
		this.startDate = startDate;
		this.durationInMonths = durationInMonths;
		this.manager = manager;
		this.createdByAdmin = createdByAdmin;
	}

	/** The contract's last day of coverage, derived from start date and duration. */
	public LocalDate getEndDate() {
		return startDate.plusMonths(durationInMonths);
	}

	/** True when the given user id owns this contract. */
	public boolean isOwnedByManager(Long userId) {
		return manager.getId().equals(userId);
	}

	public String getProjectName() {
		return projectName;
	}

	public LocalDate getStartDate() {
		return startDate;
	}

	public Integer getDurationInMonths() {
		return durationInMonths;
	}

	public User getManager() {
		return manager;
	}

	public User getCreatedByAdmin() {
		return createdByAdmin;
	}
}
