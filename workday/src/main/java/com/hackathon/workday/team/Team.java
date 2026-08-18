package com.hackathon.workday.team;

import com.hackathon.workday.common.BaseEntity;
import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * A managed group of workers. One manager owns many teams; a team has exactly
 * one manager in MVP 1, which keeps ownership checks a single comparison.
 *
 * <p>The manager is a MANAGER-role {@link User}, not a {@code Worker}: managers
 * do not record hours against assignments.
 */
@Entity
@Table(name = "teams")
public class Team extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "organization_id", nullable = false)
	private Organization organization;

	@Column(nullable = false, length = 150)
	private String name;

	@Column(nullable = false, length = 50)
	private String code;

	@Column(length = 500)
	private String description;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "manager_id", nullable = false)
	private User manager;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private TeamStatus status = TeamStatus.ACTIVE;

	protected Team() {
		// for JPA
	}

	public Team(Organization organization, String name, String code, String description, User manager) {
		this.organization = organization;
		this.name = name;
		this.code = code;
		this.description = description;
		this.manager = manager;
		this.status = TeamStatus.ACTIVE;
	}

	/** True when the given user id is this team's manager. */
	public boolean isManagedBy(Long userId) {
		return manager != null && manager.getId().equals(userId);
	}

	public boolean isActive() {
		return status == TeamStatus.ACTIVE;
	}

	public Organization getOrganization() {
		return organization;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getCode() {
		return code;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public User getManager() {
		return manager;
	}

	public void setManager(User manager) {
		this.manager = manager;
	}

	public TeamStatus getStatus() {
		return status;
	}

	public void setStatus(TeamStatus status) {
		this.status = status;
	}
}
