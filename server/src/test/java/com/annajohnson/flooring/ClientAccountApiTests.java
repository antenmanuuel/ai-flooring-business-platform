package com.annajohnson.flooring;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.annajohnson.flooring.auth.AuthCookies;

import jakarta.servlet.http.Cookie;

/** The client's password change, and how it ends other sessions. */
class ClientAccountApiTests extends ApiTestSupport {

	private Cookie client;

	@BeforeEach
	void setUp() throws Exception {
		insertActiveClient("Jane", "jane@example.com");
		client = login("jane@example.com", PASSWORD);
	}

	private ResultActions changePassword(Cookie cookie, String current, String next) throws Exception {
		return mvc.perform(post("/api/client/account/password").cookie(cookie)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"currentPassword\":\"" + current + "\",\"newPassword\":\"" + next + "\"}"));
	}

	@Test
	void changingPasswordKeepsThisSessionAndEndsOthers() throws Exception {
		Cookie otherDevice = login("jane@example.com", PASSWORD);
		// Tokens record whole seconds, so let a second pass before the change.
		Thread.sleep(1100);

		Cookie fresh = changePassword(client, PASSWORD, "NewPassword456").andExpect(status().isNoContent())
			.andReturn()
			.getResponse()
			.getCookie(AuthCookies.NAME);

		mvc.perform(get("/api/auth/me").cookie(fresh)).andExpect(status().isOk());
		mvc.perform(get("/api/auth/me").cookie(otherDevice))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.error").value("Your session has expired. Please log in again."));

		login("jane@example.com", "NewPassword456");
	}

	@Test
	void wrongCurrentPasswordIsAFieldError() throws Exception {
		changePassword(client, "not-my-password", "NewPassword456").andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fields.currentPassword").value("Current password is incorrect."));
	}

	@Test
	void newPasswordMustFollowTheRules() throws Exception {
		changePassword(client, PASSWORD, "short").andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fields.newPassword").value("Password must be at least 8 characters."));
		changePassword(client, PASSWORD, PASSWORD).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fields.newPassword")
				.value("New password must be different from your current password."));
	}

	@Test
	void tooManyWrongCurrentPasswordsAreLimited() throws Exception {
		for (int i = 0; i < 5; i++) {
			changePassword(client, "wrong-" + i, "NewPassword456").andExpect(status().isBadRequest());
		}
		changePassword(client, PASSWORD, "NewPassword456").andExpect(status().isTooManyRequests());
	}

	@Test
	void adminCantUseTheClientAccountPage() throws Exception {
		changePassword(adminCookie(), PASSWORD, "NewPassword456").andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error").value("Clients only."));
	}
}
