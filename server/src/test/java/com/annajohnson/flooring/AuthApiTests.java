package com.annajohnson.flooring;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import jakarta.servlet.http.Cookie;

/** Registration, login, the session cookie and failed-login limits. */
class AuthApiTests extends ApiTestSupport {

	private static final String NEW_CLIENT = """
			{"firstName":"Jane","lastName":"Smith","email":"Jane@Example.com","address":"1 Main St","city":"Detroit",
			 "state":"MI","zipCode":"48201","country":"USA","phone":"(313) 555-0100","password":"Password123"}""";

	private ResultActions postJson(String path, String body) throws Exception {
		return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body));
	}

	@Test
	void registerCreatesPendingClientThatCantLogInYet() throws Exception {
		postJson("/api/auth/register", NEW_CLIENT).andExpect(status().isCreated())
			.andExpect(jsonPath("$.client.email").value("jane@example.com"))
			.andExpect(jsonPath("$.client.role").value("client"));

		postJson("/api/auth/login", "{\"email\":\"jane@example.com\",\"password\":\"Password123\"}")
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error").value("Your account is waiting for approval. Please try again later."));
	}

	@Test
	void registerReportsEveryInvalidField() throws Exception {
		postJson("/api/auth/register", "{\"email\":\"nope\",\"password\":\"short\",\"zipCode\":\"!\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.error").value("Please fix the highlighted fields."))
			.andExpect(jsonPath("$.fields.firstName").value("First name is required."))
			.andExpect(jsonPath("$.fields.email").value("Enter a valid email address."))
			.andExpect(jsonPath("$.fields.zipCode").value("Enter a valid ZIP code."))
			.andExpect(jsonPath("$.fields.password").value("Password must be at least 8 characters."));
	}

	@Test
	void registerRejectsDuplicateEmail() throws Exception {
		insertActiveClient("Jane", "jane@example.com");
		postJson("/api/auth/register", NEW_CLIENT).andExpect(status().isConflict())
			.andExpect(jsonPath("$.fields.email").value("An account with this email already exists."));
	}

	@Test
	void loginSetsCookieThatMeAccepts() throws Exception {
		insertActiveClient("Jane", "jane@example.com");
		Cookie cookie = login("jane@example.com", PASSWORD);

		mvc.perform(get("/api/auth/me").cookie(cookie))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.client.firstName").value("Jane"))
			.andExpect(jsonPath("$.client.city").value("Detroit"))
			.andExpect(jsonPath("$.client.passwordHash").doesNotExist());
	}

	@Test
	void meWithoutCookieIs401() throws Exception {
		mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.error").value("Not logged in."));
	}

	@Test
	void disabledAccountIsLoggedOutStraightAway() throws Exception {
		long id = insertActiveClient("Jane", "jane@example.com");
		Cookie cookie = login("jane@example.com", PASSWORD);
		jdbc.sql("UPDATE Client SET status = 'disabled' WHERE client_id = ?").param(id).update();

		mvc.perform(get("/api/auth/me").cookie(cookie)).andExpect(status().isUnauthorized());
	}

	@Test
	void wrongPasswordAndUnknownEmailGetTheSameMessage() throws Exception {
		insertActiveClient("Jane", "jane@example.com");
		postJson("/api/auth/login", "{\"email\":\"jane@example.com\",\"password\":\"wrong-password\"}")
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.error").value("Incorrect email or password."));
		postJson("/api/auth/login", "{\"email\":\"nobody@example.com\",\"password\":\"wrong-password\"}")
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.error").value("Incorrect email or password."));
	}

	@Test
	void fiveWrongPasswordsLockTheAccountForAWhile() throws Exception {
		insertActiveClient("Jane", "jane@example.com");
		String wrong = "{\"email\":\"jane@example.com\",\"password\":\"wrong-password\"}";
		for (int i = 0; i < 5; i++) {
			postJson("/api/auth/login", wrong).andExpect(status().isUnauthorized());
		}

		// Even the right password is refused until the window passes.
		postJson("/api/auth/login", "{\"email\":\"jane@example.com\",\"password\":\"" + PASSWORD + "\"}")
			.andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.error").value("Too many failed attempts. Please try again in 15 minutes."));
	}

	@Test
	void unknownRouteIsJson404() throws Exception {
		mvc.perform(get("/api/nope")).andExpect(status().isNotFound()).andExpect(jsonPath("$.error").value("Not found"));
	}
}
