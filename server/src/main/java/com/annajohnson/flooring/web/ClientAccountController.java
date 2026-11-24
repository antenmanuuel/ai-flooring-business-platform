package com.annajohnson.flooring.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.annajohnson.flooring.auth.AuthCookies;
import com.annajohnson.flooring.auth.AuthInterceptor;
import com.annajohnson.flooring.auth.JwtService;
import com.annajohnson.flooring.auth.LoginAttemptLimiter;
import com.annajohnson.flooring.auth.PasswordRules;
import com.annajohnson.flooring.client.ClientRepository;
import com.annajohnson.flooring.client.ClientRow;

import jakarta.servlet.http.HttpServletRequest;

/** The logged-in client's own account. Every path here needs a logged-in client (enforced in WebConfig). */
@RestController
@RequestMapping("/api/client/account")
public class ClientAccountController {

	private final ClientRepository clients;
	private final BCryptPasswordEncoder passwords;
	private final JwtService jwt;
	private final AuthCookies authCookies;
	private final LoginAttemptLimiter limiter;

	public ClientAccountController(ClientRepository clients, BCryptPasswordEncoder passwords, JwtService jwt,
			AuthCookies authCookies, LoginAttemptLimiter limiter) {
		this.clients = clients;
		this.passwords = passwords;
		this.jwt = jwt;
		this.authCookies = authCookies;
		this.limiter = limiter;
	}

	/**
	 * Body: { currentPassword, newPassword }. Changing the password logs out every other device
	 * (older tokens are rejected by AuthInterceptor); this one gets a fresh login cookie.
	 * Wrong current passwords count toward the same limit as failed logins.
	 */
	@PostMapping("/password")
	public ResponseEntity<Void> changePassword(@RequestAttribute(AuthInterceptor.CURRENT_CLIENT) ClientRow client,
			@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
		String currentPassword = readString(body, "currentPassword");
		String newPassword = readString(body, "newPassword");

		Map<String, String> errors = new LinkedHashMap<>();
		if (currentPassword.isEmpty()) errors.put("currentPassword", "Current password is required.");
		String problem = PasswordRules.problemWith(newPassword);
		if (problem != null) errors.put("newPassword", problem);
		else if (newPassword.equals(currentPassword)) {
			errors.put("newPassword", "New password must be different from your current password.");
		}
		if (!errors.isEmpty()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Please fix the highlighted fields.", errors);
		}

		String limitKey = "password:" + client.id();
		limiter.check(limitKey, LoginAttemptLimiter.MAX_PER_ACCOUNT);
		String hash = clients.findPasswordHash(client.id()).orElseThrow();
		if (PasswordRules.tooLong(currentPassword) || !passwords.matches(currentPassword, hash)) {
			limiter.recordFailure(limitKey);
			String message = "Current password is incorrect.";
			throw new ApiException(HttpStatus.BAD_REQUEST, message, Map.of("currentPassword", message));
		}
		limiter.reset(limitKey);

		clients.updatePassword(client.id(), passwords.encode(newPassword));
		ClientRow updated = clients.findById(client.id()).orElseThrow();
		return ResponseEntity.noContent()
			.header(HttpHeaders.SET_COOKIE, authCookies.login(jwt.sign(updated), request).toString())
			.build();
	}

	/** Non-string values (numbers, null, missing) are treated as empty. */
	private static String readString(Map<String, Object> body, String key) {
		return body != null && body.get(key) instanceof String s ? s : "";
	}
}
