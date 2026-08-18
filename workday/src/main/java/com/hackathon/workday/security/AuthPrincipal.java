package com.hackathon.workday.security;

import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * The authenticated caller, rebuilt from the JWT on every request. This is the
 * only trusted source of identity: request bodies and query parameters never
 * decide who the caller is.
 */
public class AuthPrincipal implements UserDetails {

	private final Long userId;
	private final String email;
	private final Role role;
	private final Long organizationId;

	public AuthPrincipal(Long userId, String email, Role role, Long organizationId) {
		this.userId = userId;
		this.email = email;
		this.role = role;
		this.organizationId = organizationId;
	}

	public static AuthPrincipal from(User user) {
		return new AuthPrincipal(
				user.getId(), user.getEmail(), user.getRole(), user.getOrganization().getId());
	}

	public Long getUserId() {
		return userId;
	}

	public Role getRole() {
		return role;
	}

	public Long getOrganizationId() {
		return organizationId;
	}

	public boolean hasRole(Role candidate) {
		return role == candidate;
	}

	public boolean isSystemAdmin() {
		return role == Role.SYSTEM_ADMIN;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return List.of(new SimpleGrantedAuthority(role.authority()));
	}

	/** Passwords are verified at login only; the principal never carries one. */
	@Override
	public String getPassword() {
		return null;
	}

	@Override
	public String getUsername() {
		return email;
	}
}
