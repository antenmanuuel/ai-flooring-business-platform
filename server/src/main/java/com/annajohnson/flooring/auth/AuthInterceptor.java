package com.annajohnson.flooring.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.util.WebUtils;

import com.annajohnson.flooring.client.ClientRepository;
import com.annajohnson.flooring.client.ClientRow;
import com.annajohnson.flooring.web.ApiException;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Rejects the request with 401 unless it carries a valid login cookie. On success stores the
 * client's current database row as the {@link #CURRENT_CLIENT} request attribute, so role changes,
 * disabled accounts and deletions apply immediately. Paths it covers are set in WebConfig.
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

	public static final String CURRENT_CLIENT = "currentClient";

	private static final String SESSION_EXPIRED = "Your session has expired. Please log in again.";

	private final JwtService jwt;
	private final ClientRepository clients;
	private final RevokedTokens revokedTokens;

	public AuthInterceptor(JwtService jwt, ClientRepository clients, RevokedTokens revokedTokens) {
		this.jwt = jwt;
		this.clients = clients;
		this.revokedTokens = revokedTokens;
	}

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
		if (CorsUtils.isPreFlightRequest(request)) {
			return true;
		}

		Cookie cookie = WebUtils.getCookie(request, AuthCookies.NAME);
		if (cookie == null || cookie.getValue().isEmpty()) {
			throw new ApiException(HttpStatus.UNAUTHORIZED, "Not logged in.");
		}

		JwtService.Session session;
		try {
			session = jwt.verify(cookie.getValue());
		}
		catch (JwtException | IllegalArgumentException ex) {
			throw ApiException.unauthorizedAndLogOut(SESSION_EXPIRED);
		}
		// Logged out: the token was copied or replayed after its owner logged out.
		if (revokedTokens.isRevoked(cookie.getValue())) {
			throw ApiException.unauthorizedAndLogOut("Not logged in.");
		}

		// Deleted or disabled accounts are logged out straight away.
		ClientRow client = clients.findById(session.clientId())
			.filter(ClientRow::isActive)
			.orElseThrow(() -> ApiException.unauthorizedAndLogOut("Not logged in."));

		// Tokens issued before the account last changed (e.g. a password change) are no longer valid,
		// so changing a password logs out every other device.
		if (session.issuedAt().isBefore(client.updatedAt())) {
			throw ApiException.unauthorizedAndLogOut(SESSION_EXPIRED);
		}

		request.setAttribute(CURRENT_CLIENT, client);
		return true;
	}
}
