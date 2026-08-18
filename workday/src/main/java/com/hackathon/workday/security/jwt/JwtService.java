package com.hackathon.workday.security.jwt;

import com.hackathon.workday.security.AuthPrincipal;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/** Issues and verifies the HS256 access tokens used for stateless auth. */
@Service
public class JwtService {

	private static final int MIN_SECRET_LENGTH = 32;

	private final SecretKey signingKey;
	private final Duration expiration;
	private final String issuer;

	public JwtService(JwtProperties properties) {
		if (properties.secret() == null || properties.secret().length() < MIN_SECRET_LENGTH) {
			throw new IllegalStateException(
					"app.jwt.secret must be at least " + MIN_SECRET_LENGTH + " characters for HS256");
		}
		this.signingKey = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
		this.expiration = Duration.ofMinutes(properties.expirationMinutes());
		this.issuer = properties.issuer();
	}

	public String generateToken(User user) {
		Instant now = Instant.now();
		return Jwts.builder()
				.subject(String.valueOf(user.getId()))
				.issuer(issuer)
				.claim("email", user.getEmail())
				.claim("role", user.getRole().name())
				.claim("organizationId", user.getOrganization().getId())
				.issuedAt(Date.from(now))
				.expiration(Date.from(now.plus(expiration)))
				.signWith(signingKey)
				.compact();
	}

	public long getExpirationSeconds() {
		return expiration.toSeconds();
	}

	/**
	 * Verifies signature, issuer and expiry, then rebuilds the caller identity
	 * purely from verified claims.
	 *
	 * @throws JwtException if the token is malformed, expired or not ours
	 */
	public AuthPrincipal parseToken(String token) {
		Claims claims = Jwts.parser()
				.verifyWith(signingKey)
				.requireIssuer(issuer)
				.build()
				.parseSignedClaims(token)
				.getPayload();

		return new AuthPrincipal(
				Long.valueOf(claims.getSubject()),
				claims.get("email", String.class),
				Role.valueOf(claims.get("role", String.class)),
				claims.get("organizationId", Number.class).longValue());
	}
}
