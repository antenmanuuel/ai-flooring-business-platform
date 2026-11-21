package com.annajohnson.flooring.auth;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * The login cookie. httpOnly keeps the token out of reach of page JavaScript;
 * SameSite=Lax blocks cross-site form posts.
 */
@Component
public class AuthCookies {

	public static final String NAME = "token";

	private final boolean secure;

	public AuthCookies(@Value("${app.cookie-secure:false}") boolean secure) {
		this.secure = secure;
	}

	public ResponseCookie login(String token) {
		return builder(token).maxAge(JwtService.SESSION_LENGTH).build();
	}

	public ResponseCookie logout() {
		return builder("").maxAge(Duration.ZERO).build();
	}

	private ResponseCookie.ResponseCookieBuilder builder(String value) {
		return ResponseCookie.from(NAME, value).httpOnly(true).sameSite("Lax").secure(secure).path("/");
	}
}
