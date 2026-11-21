package com.annajohnson.flooring.client;

/** A validated registration, ready to insert. */
public record NewClient(String firstName, String lastName, String email, String address, String city, String state,
		String zipCode, String country, String phone, String passwordHash) {
}
