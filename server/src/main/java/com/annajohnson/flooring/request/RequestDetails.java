package com.annajohnson.flooring.request;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * A whole quote request with its rooms and photo URLs. {@code client} is filled in for the admin
 * and left null on the client's own project page. {@code preferredDate} is plain yyyy-mm-dd text,
 * so it can't shift a day by time zone.
 */
public record RequestDetails(long id, String status, Instant createdAt, String serviceAddress, String preferredDate,
		BigDecimal budget, String notes, RequestClient client, BigDecimal totalArea, List<RequestRoom> rooms,
		List<String> photos) {
}
