package com.annajohnson.flooring.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Login tokens that were logged out before they expired, so a copied token stops working once its
 * owner logs out. Only a SHA-256 hash of each token is kept, until the token would have expired anyway.
 * Kept in memory like LoginAttemptLimiter, so a restart forgets them (fine for a single server; tokens
 * still expire after JwtService.SESSION_LENGTH, and a password change ends every older session).
 */
@Component
public class RevokedTokens {

	private final Map<String, Instant> revoked = new ConcurrentHashMap<>();
	private final Clock clock = Clock.systemUTC();

	public void revoke(String token, Instant expiresAt) {
		Instant now = clock.instant();
		revoked.values().removeIf(expiry -> expiry.isBefore(now)); // forget ones that have expired anyway
		if (expiresAt.isAfter(now)) {
			revoked.put(hash(token), expiresAt);
		}
	}

	public boolean isRevoked(String token) {
		return revoked.containsKey(hash(token));
	}

	private static String hash(String token) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException(ex); // every Java runtime has SHA-256
		}
	}
}
