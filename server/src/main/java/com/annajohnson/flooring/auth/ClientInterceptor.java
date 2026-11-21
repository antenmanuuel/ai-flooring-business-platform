package com.annajohnson.flooring.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.servlet.HandlerInterceptor;

import com.annajohnson.flooring.client.ClientRow;
import com.annajohnson.flooring.web.ApiException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Runs after AuthInterceptor to restrict a path to clients, e.g. the admin can't send quote requests (403). */
@Component
public class ClientInterceptor implements HandlerInterceptor {

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
		if (CorsUtils.isPreFlightRequest(request)) {
			return true;
		}
		if (!(request.getAttribute(AuthInterceptor.CURRENT_CLIENT) instanceof ClientRow client) || !client.isClient()) {
			throw new ApiException(HttpStatus.FORBIDDEN, "Clients only.");
		}
		return true;
	}
}
