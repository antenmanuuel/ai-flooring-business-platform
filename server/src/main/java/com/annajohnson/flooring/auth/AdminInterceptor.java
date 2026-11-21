package com.annajohnson.flooring.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.servlet.HandlerInterceptor;

import com.annajohnson.flooring.client.ClientRow;
import com.annajohnson.flooring.web.ApiException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Runs after AuthInterceptor to restrict a path to admins (403 for everyone else). */
@Component
public class AdminInterceptor implements HandlerInterceptor {

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
		if (CorsUtils.isPreFlightRequest(request)) {
			return true;
		}
		if (!(request.getAttribute(AuthInterceptor.CURRENT_CLIENT) instanceof ClientRow client) || !client.isAdmin()) {
			throw new ApiException(HttpStatus.FORBIDDEN, "Admins only.");
		}
		return true;
	}
}
