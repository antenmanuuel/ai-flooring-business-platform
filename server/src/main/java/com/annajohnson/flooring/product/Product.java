package com.annajohnson.flooring.product;

import java.math.BigDecimal;
import java.time.Instant;

/** A full Product row, as shown on the admin Products page. */
public record Product(long productId, String name, String description, String category, String manufacturer,
		String style, String color, BigDecimal unitPrice, String pricingUnit, String dimensions,
		BigDecimal coveragePerBox, String imageUrl, Instant createdAt, Instant updatedAt) {
}
