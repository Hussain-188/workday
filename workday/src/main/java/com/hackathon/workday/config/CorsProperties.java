package com.hackathon.workday.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param allowedOrigins exact origins permitted to call the API. Wildcards are
 *        deliberately not supported: the React dev origin is configured
 *        explicitly via {@code CORS_ALLOWED_ORIGINS}.
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
