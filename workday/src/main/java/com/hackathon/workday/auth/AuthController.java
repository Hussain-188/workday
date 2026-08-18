package com.hackathon.workday.auth;

import com.hackathon.workday.auth.dto.CurrentUserResponse;
import com.hackathon.workday.auth.dto.LoginRequest;
import com.hackathon.workday.auth.dto.LoginResponse;
import com.hackathon.workday.security.AuthPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	/** The only unauthenticated endpoint in the API. */
	@PostMapping("/login")
	public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
		return ResponseEntity.ok(authService.login(request));
	}

	/**
	 * Confirms a stored token is still valid and returns who it belongs to.
	 * A 401 here is the client's signal to clear the session and re-login.
	 */
	@GetMapping("/me")
	public CurrentUserResponse currentUser(@AuthenticationPrincipal AuthPrincipal actor) {
		return authService.currentUser(actor);
	}
}
