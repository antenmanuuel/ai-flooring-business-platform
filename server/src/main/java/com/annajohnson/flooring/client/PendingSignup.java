package com.annajohnson.flooring.client;

/** A sign-up waiting for the admin's approval. */
public record PendingSignup(long id, String firstName, String lastName) {
}
