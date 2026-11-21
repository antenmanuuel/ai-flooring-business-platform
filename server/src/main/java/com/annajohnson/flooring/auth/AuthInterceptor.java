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

	private final JwtService jwt;
	private final ClientRepository clients;

	public AuthInterceptor(JwtService jwt, ClientRepository clients) {
		this.jwt = jwt;
		this.clients = clients;
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

		long clientId;
		try {
			clientId = jwt.verify(cookie.getValue());
		}
		catch (JwtException | IllegalArgumentException ex) {
			throw ApiException.unauthorizedAndLogOut("Your session has expired. Please log in again.");
		}

		// Deleted or disabled accounts are logged out straight away.
		ClientRow client = clients.findById(clientId)
			.filter(ClientRow::isActive)
			.orElseThrow(() -> ApiException.unauthorizedAndLogOut("Not logged in."));

		request.setAttribute(CURRENT_CLIENT, client);
		return true;
	}
}
