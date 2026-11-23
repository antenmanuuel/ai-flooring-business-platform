package com.annajohnson.flooring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.annajohnson.flooring.auth.AuthCookies;
import com.annajohnson.flooring.auth.LoginAttemptLimiter;

import jakarta.servlet.http.Cookie;

/**
 * Base class for the API tests: the whole app with MockMvc, against the test database
 * (application-test.properties). Every table is emptied before each test.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class ApiTestSupport {

	protected static final String ADMIN_EMAIL = "admin@test.com";
	protected static final String PASSWORD = "Password123";

	/** Just enough of a JPEG for the upload check, which reads the first bytes. */
	protected static final byte[] JPEG = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I',
			'F', 0 };

	@Autowired
	protected MockMvc mvc;

	@Autowired
	protected JdbcClient jdbc;

	@Autowired
	private BCryptPasswordEncoder passwords;

	@Autowired
	private LoginAttemptLimiter limiter;

	@BeforeEach
	void resetDatabase() {
		// Safety net: these deletes must never run against a real database.
		String db = jdbc.sql("SELECT DATABASE()").query(String.class).single();
		assertThat(db).as("tests must use a *_test database").endsWith("_test");

		for (String table : new String[] { "RequestPhoto", "RequestRoom", "Request", "Product", "Client" }) {
			jdbc.sql("DELETE FROM " + table).update();
		}
		limiter.clear();
	}

	/** Inserts an account directly (skipping registration) and returns its id. */
	protected long insertClient(String firstName, String email, String role, String status) {
		var keys = new GeneratedKeyHolder();
		jdbc.sql("""
				INSERT INTO Client (first_name, last_name, email, address, city, state, zip_code, country, phone,
				                    password_hash, role, status)
				VALUES (?, 'Tester', ?, '1 Main St', 'Detroit', 'MI', '48201', 'USA', '3135550100', ?, ?, ?)""")
			.params(firstName, email, passwords.encode(PASSWORD), role, status)
			.update(keys);
		return keys.getKey().longValue();
	}

	protected long insertActiveClient(String firstName, String email) {
		return insertClient(firstName, email, "client", "active");
	}

	protected Cookie adminCookie() throws Exception {
		insertClient("Anna", ADMIN_EMAIL, "admin", "active");
		return login(ADMIN_EMAIL, PASSWORD);
	}

	/** Logs in and returns the login cookie. */
	protected Cookie login(String email, String password) throws Exception {
		Cookie cookie = mvc
			.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getCookie(AuthCookies.NAME);
		assertThat(cookie).isNotNull();
		return cookie;
	}

	/** Inserts a catalog product priced per square foot and returns its id. */
	protected long insertProduct(String name, String unitPrice) {
		var keys = new GeneratedKeyHolder();
		jdbc.sql("""
				INSERT INTO Product (name, category, manufacturer, style, color, unit_price, pricing_unit)
				VALUES (?, 'Hardwood', 'Bruce', 'Plank', 'Natural', ?, 'sq ft')""")
			.params(name, new BigDecimal(unitPrice))
			.update(keys);
		return keys.getKey().longValue();
	}

	/** Inserts a pending quote request with one 100 sq ft room and returns its number. */
	protected long insertRequest(long clientId, long productId) {
		var keys = new GeneratedKeyHolder();
		jdbc.sql("INSERT INTO Request (client_id, service_address) VALUES (?, '1 Main St')").param(clientId).update(keys);
		long requestId = keys.getKey().longValue();
		jdbc.sql("INSERT INTO RequestRoom (request_id, name, product_id, area_sqft) VALUES (?, 'Kitchen', ?, 100)")
			.params(requestId, productId)
			.update();
		return requestId;
	}

	protected static MockMultipartFile jpeg(String part) {
		return new MockMultipartFile(part, "floor.jpg", "image/jpeg", JPEG);
	}
}
