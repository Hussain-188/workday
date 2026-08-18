package com.hackathon.workday.assignment;

import com.hackathon.workday.common.BaseEntity;
import com.hackathon.workday.team.Team;
import com.hackathon.workday.user.User;
import com.hackathon.workday.worker.Worker;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

/**
 * The MVP 1 work relationship: a manager makes a worker responsible for a piece
 * of work, and hours are recorded against it.
 *
 * <p>This is not a task. MVP 2's finer-grained task and reassignment features
 * are expected to reference an Assignment rather than replace it.
 */
@Entity
@Table(name = "assignments")
public class Assignment extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "team_id", nullable = false)
	private Team team;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "worker_id", nullable = false)
	private Worker worker;

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

	protected Assignment() {
		// for JPA
	}

	public Assignment(Team team, Worker worker, User manager, String title, String description,
			LocalDate startDate, LocalDate endDate) {
		this.team = team;
		this.worker = worker;
		this.manager = manager;
		this.title = title;
		this.description = description;
		this.startDate = startDate;
		this.endDate = endDate;
		this.status = AssignmentStatus.ACTIVE;
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

	public Worker getWorker() {
		return worker;
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
}
