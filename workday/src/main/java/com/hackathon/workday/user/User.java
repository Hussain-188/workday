package com.hackathon.workday.user;

import com.hackathon.workday.common.BaseEntity;
import com.hackathon.workday.organization.Organization;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * The authentication identity. Every person who can log in has exactly one
 * User, whatever their role. Worker-specific employment data lives on
 * {@code Worker} and is deliberately not duplicated here.
 */
@Entity
@Table(name = "users")
public class User extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "organization_id", nullable = false)
	private Organization organization;

	@Column(nullable = false, length = 150)
	private String name;

	@Column(nullable = false, length = 255, unique = true)
	private String email;

	/** BCrypt hash. A plaintext password never reaches this field. */
	@Column(name = "password_hash", nullable = false, length = 100)
	private String passwordHash;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Role role;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private UserStatus status = UserStatus.ACTIVE;

	protected User() {
		// for JPA
	}

	public User(Organization organization, String name, String email, String passwordHash, Role role) {
		this.organization = organization;
		this.name = name;
		this.email = email;
		this.passwordHash = passwordHash;
		this.role = role;
		this.status = UserStatus.ACTIVE;
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

	public String getEmail() {
		return email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public Role getRole() {
		return role;
	}

	public void setRole(Role role) {
		this.role = role;
	}

	public UserStatus getStatus() {
		return status;
	}

	public void setStatus(UserStatus status) {
		this.status = status;
	}

	public boolean isActive() {
		return status == UserStatus.ACTIVE;
	}
}
