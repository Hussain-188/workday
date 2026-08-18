package com.hackathon.workday.organization;

import com.hackathon.workday.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/**
 * The tenancy boundary. MVP 1 runs a single organization, but every user, team
 * and worker is scoped to one so that a second organization can be added later
 * without reshaping the schema.
 */
@Entity
@Table(name = "organizations")
public class Organization extends BaseEntity {

	@Column(nullable = false, length = 150)
	private String name;

	@Column(nullable = false, length = 50, unique = true)
	private String code;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private OrganizationStatus status = OrganizationStatus.ACTIVE;

	protected Organization() {
		// for JPA
	}

	public Organization(String name, String code) {
		this.name = name;
		this.code = code;
		this.status = OrganizationStatus.ACTIVE;
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

	public OrganizationStatus getStatus() {
		return status;
	}

	public void setStatus(OrganizationStatus status) {
		this.status = status;
	}

	public boolean isActive() {
		return status == OrganizationStatus.ACTIVE;
	}
}
