package com.annajohnson.flooring.auth;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.annajohnson.flooring.client.ClientRow;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;

/** Signs and checks login tokens: HS256 JWTs carrying the client id (sub) and role. */
@Component
public class JwtService {

	public static final Duration SESSION_LENGTH = Duration.ofDays(7);

	private final SecretKey key;

	public JwtService(@Value("${app.jwt-secret}") String secret) {
		if (secret == null || secret.isBlank()) {
			throw new IllegalStateException("JWT_SECRET is not set. Add it to server/.env (see .env.example).");
		}
		byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
		if (bytes.length < 32) {
			throw new IllegalStateException("JWT_SECRET must be at least 32 characters. See .env.example to generate one.");
		}
		this.key = new SecretKeySpec(bytes, "HmacSHA256");
	}

	/** A valid token's client id and when it was issued. */
	public record Session(long clientId, Instant issuedAt) {
	}

	/**
	 * Signs a token for the client. It's never dated before the row's last change (e.g. a password
	 * change), so it isn't rejected as an older session if the database clock runs slightly ahead.
	 */
	public String sign(ClientRow client) {
		Instant now = Instant.now();
		if (client.updatedAt() != null && client.updatedAt().isAfter(now)) {
			now = client.updatedAt();
		}
		return Jwts.builder()
			.subject(String.valueOf(client.id()))
			.claim("role", client.role())
			.issuedAt(Date.from(now))
			.expiration(Date.from(now.plus(SESSION_LENGTH)))
			.signWith(key, Jwts.SIG.HS256)
			.compact();
	}

	/**
	 * Returns the client id and issue time from a valid, unexpired token.
	 * @throws JwtException if the token is tampered with, expired or malformed
	 */
	public Session verify(String token) {
		Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
		if (claims.getIssuedAt() == null) {
			throw new JwtException("Token has no issue time.");
		}
		try {
			return new Session(Long.parseLong(claims.getSubject()), claims.getIssuedAt().toInstant());
		}
		catch (NumberFormatException ex) {
			throw new JwtException("Token subject is not a client id.");
		}
	}
}
