package com.annajohnson.flooring.auth;

import java.nio.charset.StandardCharsets;

/** The rules a new password must meet, shared by registration and the client's password change. */
public final class PasswordRules {

	public static final int MIN_LENGTH = 8;
	/** BCrypt only uses the first 72 bytes of a password (and Spring's encoder rejects longer ones). */
	public static final int MAX_BYTES = 72;

	private PasswordRules() {
	}

	/** What's wrong with a new password, or null if it's fine. */
	public static String problemWith(String password) {
		if (password.length() < MIN_LENGTH) {
			return "Password must be at least " + MIN_LENGTH + " characters.";
		}
		if (tooLong(password)) {
			return "Password must be 72 characters or fewer.";
		}
		return null;
	}

	/** True when the password is longer than BCrypt can check, so it can't be anyone's password. */
	public static boolean tooLong(String password) {
		return password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES;
	}
}
