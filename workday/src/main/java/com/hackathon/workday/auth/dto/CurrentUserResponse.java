package com.hackathon.workday.auth.dto;

import com.hackathon.workday.user.Role;

/**
 * The identity behind the current token. Lets a client that restored a token
 * from storage confirm it is still valid before rendering the app.
 *
 * @param workerId populated only for WORKER accounts; null for every other role
 */
public record CurrentUserResponse(
		Long userId,
		String name,
		String email,
		Role role,
		Long organizationId,
		String organizationName,
		Long workerId) {
}
