package com.hackathon.workday.auth.dto;

import com.hackathon.workday.user.Role;

/**
 * @param expiresInSeconds lifetime of the token, so the client can refresh the
 *        session before it lapses
 * @param workerId populated only for WORKER accounts; null for every other role
 */
public record LoginResponse(
		String accessToken,
		String tokenType,
		long expiresInSeconds,
		Long userId,
		String name,
		String email,
		Role role,
		Long organizationId,
		String organizationName,
		Long workerId) {
}
