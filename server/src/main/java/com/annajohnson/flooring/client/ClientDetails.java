package com.annajohnson.flooring.client;

import java.time.Instant;

/** Everything the admin client detail page shows. */
public record ClientDetails(long id, String firstName, String lastName, String email, String phone, String address, String city,
		String state, String zipCode, String country, String status, Instant createdAt) {
}
