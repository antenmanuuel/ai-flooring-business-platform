package com.annajohnson.flooring.client;

import java.time.Instant;

/** One row of the admin Clients list. */
public record ClientSummary(long id, String firstName, String lastName, String email, String phone, String address, String city,
		String state, String status, Instant createdAt) {
}
