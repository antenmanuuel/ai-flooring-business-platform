package com.annajohnson.flooring.request;

/** Who sent a quote request, as shown to the admin. */
public record RequestClient(long id, String firstName, String lastName, String email, String phone) {
}
