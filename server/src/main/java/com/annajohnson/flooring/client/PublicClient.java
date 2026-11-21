package com.annajohnson.flooring.client;

/**
 * The shape of the logged-in client sent to the browser. The address is used to prefill the
 * service address on the quote request form. Never include the password hash.
 */
public record PublicClient(long id, String firstName, String lastName, String email, String role, String address,
		String city, String state, String zipCode) {

	public static PublicClient from(ClientRow row) {
		return new PublicClient(row.id(), row.firstName(), row.lastName(), row.email(), row.role(), row.address(),
				row.city(), row.state(), row.zipCode());
	}
}
