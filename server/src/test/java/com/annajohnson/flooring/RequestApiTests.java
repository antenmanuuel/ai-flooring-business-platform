package com.annajohnson.flooring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;

/** Quote requests: the client's form, their dashboard and project page, and the admin's views. */
class RequestApiTests extends ApiTestSupport {

	private long clientId;
	private long productId;
	private Cookie client;

	@BeforeEach
	void setUp() throws Exception {
		clientId = insertActiveClient("Jane", "jane@example.com");
		productId = insertProduct("White Oak", "7.50");
		client = login("jane@example.com", PASSWORD);
	}

	/** A valid form: a kitchen measured 12 × 10.5 ft and a 200 sq ft den. */
	private String validForm() {
		return """
				{"address":"1 Main St, Detroit","preferredDate":"%s","budget":"5000","notes":"Match the trim.",
				 "rooms":[
				   {"name":"Kitchen","productId":"%d","length":"12","width":"10.5","area":"","currentFlooring":"Tile",
				    "pattern":"Herringbone","removeExisting":true},
				   {"name":"Den","productId":"%d","area":"200","pattern":"Straight","removeExisting":false}
				 ]}""".formatted(LocalDate.now().plusMonths(2), productId, productId);
	}

	private MockMultipartHttpServletRequestBuilder sendRequest(String data) {
		MockMultipartHttpServletRequestBuilder builder = multipart("/api/client/requests");
		builder.param("data", data).cookie(client);
		return builder;
	}

	private long createRequest() throws Exception {
		String body = mvc.perform(sendRequest(validForm()).file(jpeg("photos")))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return ((Number) JsonPath.read(body, "$.id")).longValue();
	}

	@Test
	void clientSendsRequestAndSeesItAsAProject() throws Exception {
		long id = createRequest();

		mvc.perform(get("/api/client/requests").cookie(client))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.requests", hasSize(1)))
			.andExpect(jsonPath("$.requests[0].roomCount").value(2))
			.andExpect(jsonPath("$.requests[0].totalArea").value(326.0))
			.andExpect(jsonPath("$.requests[0].roomNames").value("Kitchen, Den"));

		mvc.perform(get("/api/client/requests/" + id).cookie(client))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.request.status").value("pending"))
			.andExpect(jsonPath("$.request.rooms[0].area").value(126.0)) // 12 × 10.5
			.andExpect(jsonPath("$.request.rooms[0].removeExisting").value(true))
			.andExpect(jsonPath("$.request.rooms[1].length").doesNotExist())
			.andExpect(jsonPath("$.request.photos", hasSize(1)))
			.andExpect(jsonPath("$.request.photos[0]", startsWith("/api/uploads/requests/")));
	}

	@Test
	void requestNumbersStartAt1001() throws Exception {
		assertThat(createRequest()).isGreaterThanOrEqualTo(1001);
	}

	@Test
	void invalidFormReportsFieldsPerRoom() throws Exception {
		String form = """
				{"address":"","preferredDate":"2020-01-01","rooms":[{"name":"","productId":"99999","length":"abc"}]}""";
		mvc.perform(sendRequest(form))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fields.address").value("Service address is required."))
			.andExpect(jsonPath("$.fields.preferredDate").value("The installation date can't be in the past."))
			.andExpect(jsonPath("$.fields['rooms.0.name']").value("Room name is required."))
			.andExpect(jsonPath("$.fields['rooms.0.length']").value("Length must be a number with up to 2 decimal places."))
			.andExpect(jsonPath("$.fields['rooms.0.productId']")
				.value("This product is no longer available. Choose another."));
	}

	@Test
	void roomNeedsAnArea() throws Exception {
		String form = """
				{"address":"1 Main St","rooms":[{"name":"Kitchen","productId":"%d"}]}""".formatted(productId);
		mvc.perform(sendRequest(form))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fields['rooms.0.area']").value("Enter the length and width, or the total area."));
	}

	@Test
	void atMostFivePhotos() throws Exception {
		var builder = sendRequest(validForm());
		for (int i = 0; i < 6; i++) {
			builder.file(jpeg("photos"));
		}
		mvc.perform(builder)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fields.photos").value("You can add up to 5 photos."));
		assertThat(jdbc.sql("SELECT COUNT(*) FROM Request").query(Integer.class).single()).isZero();
	}

	@Test
	void unreadableDataIsRejected() throws Exception {
		mvc.perform(sendRequest("not json")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.error").value("Invalid request."));
	}

	@Test
	void clientCantOpenSomeoneElsesRequest() throws Exception {
		long otherRequest = insertRequest(insertActiveClient("Bob", "bob@example.com"), productId);
		mvc.perform(get("/api/client/requests/" + otherRequest).cookie(client))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.error").value("Project not found."));
	}

	@Test
	void adminCantSendRequests() throws Exception {
		mvc.perform(get("/api/client/requests").cookie(adminCookie()))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error").value("Clients only."));
	}

	@Test
	void adminSeesNewRequestOnOverviewAndRequestsPage() throws Exception {
		long id = createRequest();
		Cookie admin = adminCookie();

		mvc.perform(get("/api/admin/overview").cookie(admin))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.stats.newRequests").value(1))
			.andExpect(jsonPath("$.newRequests[0].id").value(id))
			.andExpect(jsonPath("$.newRequests[0].firstName").value("Jane"));

		mvc.perform(get("/api/admin/requests").cookie(admin))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.requests[0].client.email").value("jane@example.com"))
			.andExpect(jsonPath("$.requests[0].rooms", hasSize(2)))
			.andExpect(jsonPath("$.requests[0].budget").value(5000.0));

		mvc.perform(get("/api/admin/clients/" + clientId).cookie(admin))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.requests[0].id").value(id));
	}

	@Test
	void clientWithRequestsCantBeDeleted() throws Exception {
		createRequest();
		mvc.perform(delete("/api/admin/clients/" + clientId).cookie(adminCookie()))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.error")
				.value("This client has quote requests, so they can't be deleted. Disable the account instead."));
	}
}
