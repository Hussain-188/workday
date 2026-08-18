package com.hackathon.workday.user.dto;

import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.UserStatus;

/** Minimal user projection, enough to populate a picker. Never exposes the hash. */
public record UserSummaryResponse(
		Long id,
		String name,
		String email,
		Role role,
		UserStatus status) {
}
