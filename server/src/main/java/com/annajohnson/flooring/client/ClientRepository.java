package com.annajohnson.flooring.client;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

/**
 * Every SQL query on the Client table. Values always go in as ? placeholders (never string-built)
 * to prevent SQL injection. Admin queries filter on role = 'client' so the admin row can't be
 * listed, changed or deleted through them.
 */
@Repository
public class ClientRepository {

	private final JdbcClient jdbc;

	public ClientRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	// ---- Login and sessions ----

	public Optional<ClientRow> findById(long id) {
		return jdbc.sql("""
				SELECT client_id, first_name, last_name, email, role, status, address, city, state, zip_code, updated_at
				FROM Client WHERE client_id = ?""")
			.param(id)
			.query(ClientRepository::mapClientRow)
			.optional();
	}

	public Optional<LoginRow> findLoginByEmail(String email) {
		return jdbc.sql("""
				SELECT client_id, first_name, last_name, email, password_hash, role, status, address, city, state, zip_code,
				       updated_at
				FROM Client WHERE email = ?""")
			.param(email)
			.query((rs, n) -> new LoginRow(mapClientRow(rs, n), rs.getString("password_hash")))
			.optional();
	}

	public Optional<String> findPasswordHash(long id) {
		return jdbc.sql("SELECT password_hash FROM Client WHERE client_id = ?").param(id).query(String.class).optional();
	}

	/** Saves a new password hash for a client (never the admin). Bumps updated_at, which ends older sessions. */
	public void updatePassword(long clientId, String passwordHash) {
		jdbc.sql("UPDATE Client SET password_hash = ? WHERE client_id = ? AND role = 'client'")
			.params(passwordHash, clientId)
			.update();
	}

	/** Inserts a new sign-up (role 'client', status 'pending' by default) and returns its id. */
	public long insert(NewClient c) {
		KeyHolder keys = new GeneratedKeyHolder();
		jdbc.sql("""
				INSERT INTO Client (first_name, last_name, email, address, city, state, zip_code, country, phone, password_hash)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""")
			.params(c.firstName(), c.lastName(), c.email(), c.address(), c.city(), c.state(), c.zipCode(),
					c.country(), c.phone(), c.passwordHash())
			.update(keys);
		return keys.getKey().longValue();
	}

	// ---- Admin dashboard ----

	/** The greeting comes from the database clock and the first name from the admin's own row. */
	public AdminGreeting greetingFor(long adminId) {
		return jdbc.sql("""
				SELECT
				  CASE
				    WHEN HOUR(NOW()) < 12 THEN 'Good morning'
				    WHEN HOUR(NOW()) < 18 THEN 'Good afternoon'
				    ELSE 'Good evening'
				  END AS greeting,
				  first_name
				FROM Client
				WHERE client_id = ?""")
			.param(adminId)
			.query((rs, n) -> new AdminGreeting(rs.getString("greeting"), rs.getString("first_name")))
			.single();
	}

	public List<PendingSignup> findPendingSignups() {
		return jdbc.sql("""
				SELECT client_id, first_name, last_name FROM Client
				WHERE role = 'client' AND status = 'pending'
				ORDER BY created_at""")
			.query((rs, n) -> new PendingSignup(rs.getLong("client_id"), rs.getString("first_name"),
					rs.getString("last_name")))
			.list();
	}

	public List<ClientSummary> findAllClients() {
		return jdbc.sql("""
				SELECT client_id, first_name, last_name,
				       email, phone, address, city, state, status, created_at
				FROM Client
				WHERE role = 'client'
				ORDER BY client_id""")
			.query((rs, n) -> new ClientSummary(rs.getLong("client_id"), rs.getString("first_name"), rs.getString("last_name"),
					rs.getString("email"), rs.getString("phone"), rs.getString("address"), rs.getString("city"),
					rs.getString("state"), rs.getString("status"), rs.getTimestamp("created_at").toInstant()))
			.list();
	}

	public Optional<ClientDetails> findClientDetails(long id) {
		return jdbc.sql("""
				SELECT client_id, first_name, last_name,
				       email, phone, address, city, state, zip_code, country, status, created_at
				FROM Client
				WHERE client_id = ? AND role = 'client'""")
			.param(id)
			.query((rs, n) -> new ClientDetails(rs.getLong("client_id"), rs.getString("first_name"), rs.getString("last_name"),
					rs.getString("email"), rs.getString("phone"), rs.getString("address"), rs.getString("city"),
					rs.getString("state"), rs.getString("zip_code"), rs.getString("country"), rs.getString("status"),
					rs.getTimestamp("created_at").toInstant()))
			.optional();
	}

	/** Returns false if no client has that id. */
	public boolean updateStatus(long id, String status) {
		return jdbc.sql("UPDATE Client SET status = ? WHERE client_id = ? AND role = 'client'")
			.params(status, id)
			.update() > 0;
	}

	/**
	 * Returns false if no client has that id.
	 * @throws org.springframework.dao.DataIntegrityViolationException if the client has quote requests,
	 * which must be kept (the foreign key blocks the delete)
	 */
	public boolean delete(long id) {
		return jdbc.sql("DELETE FROM Client WHERE client_id = ? AND role = 'client'").param(id).update() > 0;
	}

	private static ClientRow mapClientRow(ResultSet rs, int rowNum) throws SQLException {
		return new ClientRow(rs.getLong("client_id"), rs.getString("first_name"), rs.getString("last_name"),
				rs.getString("email"), rs.getString("role"), rs.getString("status"), rs.getString("address"),
				rs.getString("city"), rs.getString("state"), rs.getString("zip_code"),
				rs.getTimestamp("updated_at").toInstant());
	}
}
