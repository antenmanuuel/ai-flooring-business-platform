package com.annajohnson.flooring.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.annajohnson.flooring.auth.AuthCookies;

/** Turns every error into a JSON body of the form { error, fields? }. */
@RestControllerAdvice
public class ApiExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

	private final AuthCookies authCookies;

	public ApiExceptionHandler(AuthCookies authCookies) {
		this.authCookies = authCookies;
	}

	@ExceptionHandler(ApiException.class)
	ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
		ResponseEntity.BodyBuilder response = ResponseEntity.status(ex.status());
		if (ex.clearAuthCookie()) {
			response.header(HttpHeaders.SET_COOKIE, authCookies.logout().toString());
		}
		return response.body(body(ex.getMessage(), ex.fields()));
	}

	/** Unknown paths, and known paths with the wrong method. */
	@ExceptionHandler({ NoHandlerFoundException.class, NoResourceFoundException.class,
			HttpRequestMethodNotSupportedException.class })
	ResponseEntity<Map<String, Object>> handleNotFound() {
		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body("Not found", null));
	}

	@ExceptionHandler({ HttpMessageNotReadableException.class, HttpMediaTypeNotSupportedException.class })
	ResponseEntity<Map<String, Object>> handleBadBody() {
		return ResponseEntity.badRequest().body(body("The request body must be a JSON object.", null));
	}

	/** A form upload (multipart/form-data) that is missing a part or can't be read. */
	@ExceptionHandler({ MissingServletRequestParameterException.class, MissingServletRequestPartException.class,
			MultipartException.class })
	ResponseEntity<Map<String, Object>> handleBadForm() {
		return ResponseEntity.badRequest().body(body("Invalid request.", null));
	}

	/** Files over spring.servlet.multipart limits. The 5 MB per-photo rule is checked with a friendlier message. */
	@ExceptionHandler(MaxUploadSizeExceededException.class)
	ResponseEntity<Map<String, Object>> handleTooLarge() {
		return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE).body(body("Request is too large.", null));
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
		log.error("Unhandled error", ex);
		return ResponseEntity.internalServerError().body(body("Internal server error", null));
	}

	private static Map<String, Object> body(String error, Map<String, String> fields) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("error", error);
		if (fields != null) {
			body.put("fields", fields);
		}
		return body;
	}
}
