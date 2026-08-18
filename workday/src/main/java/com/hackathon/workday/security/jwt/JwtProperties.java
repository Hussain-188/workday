package com.hackathon.workday.security.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param secret HMAC-SHA key material; must be at least 32 characters
 * @param expirationMinutes token lifetime
 * @param issuer required and verified on every incoming token
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, long expirationMinutes, String issuer) {
}
