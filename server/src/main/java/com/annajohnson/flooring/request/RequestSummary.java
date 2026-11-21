package com.annajohnson.flooring.request;

import java.math.BigDecimal;
import java.time.Instant;

/** One line in a list of a client's quote requests (their dashboard, and the admin client page). */
public record RequestSummary(long id, String status, Instant createdAt, int roomCount, BigDecimal totalArea,
		String roomNames) {
}
