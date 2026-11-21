package com.annajohnson.flooring.web;

import java.util.Map;

import org.springframework.http.HttpStatus;

/**
 * Throw from a controller or interceptor to send {@code { error, fields? }} with the given status.
 * {@code fields} maps form field names to messages so the client can show them next to each input.
 * ApiExceptionHandler turns it into the response.
 */
public class ApiException extends RuntimeException {

	private final HttpStatus status;
	private final Map<String, String> fields;
	private final boolean clearAuthCookie;

	public ApiException(HttpStatus status, String message) {
		this(status, message, null, false);
	}

	public ApiException(HttpStatus status, String message, Map<String, String> fields) {
		this(status, message, fields, false);
	}

	private ApiException(HttpStatus status, String message, Map<String, String> fields, boolean clearAuthCookie) {
		super(message, null, false, false);
		this.status = status;
		this.fields = fields;
		this.clearAuthCookie = clearAuthCookie;
	}

	/** A 401 that also logs the browser out by clearing the login cookie. */
	public static ApiException unauthorizedAndLogOut(String message) {
		return new ApiException(HttpStatus.UNAUTHORIZED, message, null, true);
	}

	public static ApiException notFound(String message) {
		return new ApiException(HttpStatus.NOT_FOUND, message);
	}

	public HttpStatus status() {
		return status;
	}

	public Map<String, String> fields() {
		return fields;
	}

	public boolean clearAuthCookie() {
		return clearAuthCookie;
	}
}
