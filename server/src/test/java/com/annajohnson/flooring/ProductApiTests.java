package com.annajohnson.flooring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;

import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;

/** The admin Products page API, the public catalog and product photos. */
class ProductApiTests extends ApiTestSupport {

	@Test
	void adminAddsProductWithPhotoAndItShowsInTheCatalog() throws Exception {
		Cookie admin = adminCookie();

		String body = mvc
			.perform(multipart("/api/admin/products").file(jpeg("image"))
				.param("name", "White Oak")
				.param("category", "Hardwood")
				.param("manufacturer", "Bruce")
				.param("style", "Plank")
				.param("color", "Natural")
				.param("unitPrice", "7.50")
				.param("pricingUnit", "box")
				.param("coveragePerBox", "22")
				.cookie(admin))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.unitPrice").value(7.5))
			.andExpect(jsonPath("$.imageUrl", startsWith("/api/uploads/products/")))
			.andReturn()
			.getResponse()
			.getContentAsString();
		String imageUrl = JsonPath.read(body, "$.imageUrl");

		mvc.perform(get("/api/products"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].name").value("White Oak"))
			.andExpect(jsonPath("$[0].coveragePerBox").value(22.0))
			.andExpect(jsonPath("$[0].manufacturer").doesNotExist());

		// The photo is served publicly.
		mvc.perform(get(imageUrl)).andExpect(status().isOk());
	}

	@Test
	void invalidProductReportsEachField() throws Exception {
		mvc.perform(multipart("/api/admin/products").param("unitPrice", "7.555")
			.param("coveragePerBox", "abc")
			.cookie(adminCookie()))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fields.name").value("Name is required."))
			.andExpect(jsonPath("$.fields.unitPrice").value("Enter a price like 7.50 (up to 2 decimal places)."))
			.andExpect(jsonPath("$.fields.coveragePerBox")
				.value("Coverage must be a number between 0 and 999,999.99, with up to 2 decimal places."));
	}

	@Test
	void fileThatIsNotReallyAnImageIsRejected() throws Exception {
		var fake = new MockMultipartFile("image", "floor.png", "image/png", "not an image".getBytes());
		mvc.perform(multipart("/api/admin/products").file(fake)
			.param("name", "Oak")
			.param("category", "Hardwood")
			.param("manufacturer", "Bruce")
			.param("style", "Plank")
			.param("color", "Natural")
			.param("unitPrice", "5")
			.cookie(adminCookie()))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fields.image").value("Image must be a JPG, PNG or WebP file."));

		assertThat(jdbc.sql("SELECT COUNT(*) FROM Product").query(Integer.class).single()).isZero();
	}

	@Test
	void editingReplacesTheProduct() throws Exception {
		long id = insertProduct("Oak", "5.00");
		mvc.perform(multipart(HttpMethod.PUT, "/api/admin/products/" + id).param("name", "Red Oak")
			.param("category", "Hardwood")
			.param("manufacturer", "Bruce")
			.param("style", "Plank")
			.param("color", "Red")
			.param("unitPrice", "6.25")
			.cookie(adminCookie()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Red Oak"))
			.andExpect(jsonPath("$.unitPrice").value(6.25));
	}

	@Test
	void clientsCantManageProducts() throws Exception {
		insertActiveClient("Jane", "jane@example.com");
		mvc.perform(get("/api/admin/products").cookie(login("jane@example.com", PASSWORD)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error").value("Admins only."));
	}

	@Test
	void productUsedInARequestCantBeDeleted() throws Exception {
		long productId = insertProduct("Oak", "5.00");
		insertRequest(insertActiveClient("Jane", "jane@example.com"), productId);

		mvc.perform(delete("/api/admin/products/" + productId).cookie(adminCookie()))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.error").value("\"Oak\" is used in quote requests, so it can't be removed."));
	}

	@Test
	void unusedProductIsDeleted() throws Exception {
		long id = insertProduct("Oak", "5.00");
		mvc.perform(delete("/api/admin/products/" + id).cookie(adminCookie())).andExpect(status().isNoContent());
		mvc.perform(delete("/api/admin/products/" + id).cookie(login(ADMIN_EMAIL, PASSWORD)))
			.andExpect(status().isNotFound());
	}
}
