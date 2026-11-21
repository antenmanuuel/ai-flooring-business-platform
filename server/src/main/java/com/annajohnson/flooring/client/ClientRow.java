package com.annajohnson.flooring.client;

/**
 * The columns of a Client row needed to know who is logged in. The address is included so the
 * quote request form can prefill the service address. Never holds the password hash.
 */
public record ClientRow(long id, String firstName, String lastName, String email, String role, String status,
		String address, String city, String state, String zipCode) {

	public boolean isActive() {
		return "active".equals(status);
	}

	public boolean isAdmin() {
		return "admin".equals(role);
	}

	public boolean isClient() {
		return "client".equals(role);
	}
}
