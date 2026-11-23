package com.annajohnson.flooring;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

/** The health checks: the app's own /api/health and Actuator's /api/actuator/health. */
class HealthApiTests extends ApiTestSupport {

	@Test
	void appHealth() throws Exception {
		mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ok"));
	}

	@Test
	void actuatorHealthIsUpWithoutDetails() throws Exception {
		mvc.perform(get("/api/actuator/health"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("UP"))
			.andExpect(jsonPath("$.components").doesNotExist());
	}

	@Test
	void otherActuatorEndpointsAreNotExposed() throws Exception {
		mvc.perform(get("/api/actuator/env")).andExpect(status().isNotFound());
		mvc.perform(get("/api/actuator/beans")).andExpect(status().isNotFound());
	}
}
