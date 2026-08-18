package com.hackathon.workday.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hackathon.workday.organization.Organization;
import com.hackathon.workday.support.IntegrationTestBase;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.user.UserStatus;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class AuthIntegrationTest extends IntegrationTestBase {

	private Organization acme;

	@BeforeEach
	void setUp() {
		acme = givenOrganization("Acme Corporation", "ACME");
		givenUser(acme, "System Admin", "admin@example.com", Role.SYSTEM_ADMIN);
	}

	@Test
	@DisplayName("1. a valid login returns a token and the caller's identity")
	void validLoginSucceeds() throws Exception {
		mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("email", "admin@example.com", "password", PASSWORD))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").isNotEmpty())
				.andExpect(jsonPath("$.tokenType").value("Bearer"))
				.andExpect(jsonPath("$.role").value("SYSTEM_ADMIN"))
				.andExpect(jsonPath("$.email").value("admin@example.com"))
				.andExpect(jsonPath("$.organizationId").value(acme.getId()))
				// The password hash must never appear in a response.
				.andExpect(jsonPath("$.passwordHash").doesNotExist());
	}

	@Test
	@DisplayName("2. a wrong password is rejected with 401 and no hint")
	void wrongPasswordFails() throws Exception {
		mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("email", "admin@example.com", "password", "wrong-password"))))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
	}

	@Test
	@DisplayName("2b. an unknown email fails the same way as a wrong password")
	void unknownEmailFails() throws Exception {
		mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("email", "nobody@example.com", "password", PASSWORD))))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
	}

	@Test
	@DisplayName("an inactive account cannot log in")
	void inactiveAccountCannotLogIn() throws Exception {
		User suspended = givenUser(acme, "Suspended", "suspended@example.com", Role.HR_MANAGER);
		suspended.setStatus(UserStatus.INACTIVE);
		userRepository.save(suspended);

		mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("email", "suspended@example.com", "password", PASSWORD))))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("login validates its request body")
	void validatesRequestBody() throws Exception {
		mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(json(Map.of("email", "not-an-email", "password", ""))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
				.andExpect(jsonPath("$.fieldErrors").isNotEmpty());
	}

	@Test
	@DisplayName("27. an unauthenticated request to a protected endpoint is rejected")
	void unauthenticatedRequestRejected() throws Exception {
		mockMvc.perform(get("/api/workers"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
	}

	@Test
	@DisplayName("a forged or corrupted token is rejected")
	void forgedTokenRejected() throws Exception {
		mockMvc.perform(get("/api/workers")
						.header(HttpHeaders.AUTHORIZATION, bearer("not.a.real.token")))
				.andExpect(status().isUnauthorized());
	}
}
