package com.annajohnson.flooring.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.core.NestedExceptionUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

	private final JdbcClient jdbc;

	public HealthController(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	@GetMapping("/health")
	public Map<String, String> health() {
		return Map.of("status", "ok", "message", "Hello from the Spring Boot server!");
	}

	/** Checks that the server can reach MySQL. */
	@GetMapping("/db-health")
	public ResponseEntity<Map<String, Object>> dbHealth() {
		Map<String, Object> body = new LinkedHashMap<>();
		try {
			jdbc.sql("SELECT DATABASE() AS db, VERSION() AS version").query((rs, n) -> {
				body.put("status", "ok");
				body.put("db", rs.getString("db"));
				body.put("version", rs.getString("version"));
				return null;
			}).list();
			return ResponseEntity.ok(body);
		}
		catch (RuntimeException ex) {
			body.clear();
			body.put("status", "error");
			body.put("message", NestedExceptionUtils.getMostSpecificCause(ex).getMessage());
			return ResponseEntity.internalServerError().body(body);
		}
	}
}
