package com.annajohnson.flooring.client;

/** A Client row plus its password hash, used only to check a login. */
public record LoginRow(ClientRow client, String passwordHash) {
}
