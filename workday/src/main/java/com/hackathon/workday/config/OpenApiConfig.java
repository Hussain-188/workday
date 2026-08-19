package com.hackathon.workday.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Metadata and the JWT bearer scheme for the generated OpenAPI document.
 * springdoc builds the paths/schemas themselves from the existing
 * {@code @RestController}s and DTOs — this bean only adds the human-facing
 * description and the "Authorize" lock so a token pasted into Swagger UI is
 * sent as {@code Authorization: Bearer <token>} on every try-it-out call.
 */
@Configuration
public class OpenApiConfig {

	private static final String BEARER_SCHEME = "bearerAuth";

	@Bean
	public OpenAPI workdayOpenApi() {
		return new OpenAPI()
				.info(new Info()
						.title("Workday API")
						.description("""
								Backend contract for the Workday workforce management system: \
								onboarding, teams, assignments, timesheets, contracts and invoices, \
								gated by role and resource ownership.

								Call POST /api/auth/login to get a token, then use the Authorize \
								button below to attach it as a Bearer token to every request.""")
						.version("MVP 3")
						.contact(new Contact().name("Workday")))
				.components(new Components()
						.addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
								.name(BEARER_SCHEME)
								.type(SecurityScheme.Type.HTTP)
								.scheme("bearer")
								.bearerFormat("JWT")))
				.addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
	}
}
