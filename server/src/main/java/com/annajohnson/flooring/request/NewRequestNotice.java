package com.annajohnson.flooring.request;

/** A quote request still waiting for the admin's first quote, for the dashboard overview. */
public record NewRequestNotice(long id, String firstName, String lastName) {
}
