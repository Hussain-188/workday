package com.hackathon.workday.user;

import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.user.dto.UserSummaryResponse;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only directory of login identities, scoped to the caller's organization.
 * Exists so an admin can pick a manager when creating a team; it is not a
 * general user-management surface, and it never exposes a password hash.
 */
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'HR_MANAGER')")
public class UserController {

	private final UserRepository userRepository;

	public UserController(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@GetMapping
	public List<UserSummaryResponse> listUsers(
			@RequestParam(required = false) Role role,
			@AuthenticationPrincipal AuthPrincipal actor) {
		List<User> users = role == null
				? userRepository.findByOrganizationIdOrderByNameAsc(actor.getOrganizationId())
				: userRepository.findByOrganizationIdAndRoleOrderByNameAsc(actor.getOrganizationId(), role);

		return users.stream()
				.map(user -> new UserSummaryResponse(
						user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getStatus()))
				.toList();
	}
}
