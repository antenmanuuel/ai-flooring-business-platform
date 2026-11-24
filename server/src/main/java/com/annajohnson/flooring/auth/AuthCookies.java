package com.annajohnson.flooring.auth;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;

/**
 * The login cookie. httpOnly keeps the token out of reach of page JavaScript;
 * SameSite=Lax blocks cross-site form posts. It's marked Secure (HTTPS only) whenever the request
 * came over HTTPS, including through a proxy that sends X-Forwarded-Proto: https, or always when
 * app.cookie-secure is on.
 */
@Component
public class AuthCookies {

	public static final String NAME = "token";

	private final boolean alwaysSecure;

	public AuthCookies(@Value("${app.cookie-secure:false}") boolean alwaysSecure) {
		this.alwaysSecure = alwaysSecure;
	}

	public ResponseCookie login(String token, HttpServletRequest request) {
		return builder(token, request).maxAge(JwtService.SESSION_LENGTH).build();
	}

	public ResponseCookie logout(HttpServletRequest request) {
		return builder("", request).maxAge(Duration.ZERO).build();
	}

	private ResponseCookie.ResponseCookieBuilder builder(String value, HttpServletRequest request) {
		boolean secure = alwaysSecure || request.isSecure();
		return ResponseCookie.from(NAME, value).httpOnly(true).sameSite("Lax").secure(secure).path("/");
	}
}
