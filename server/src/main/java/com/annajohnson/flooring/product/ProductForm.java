package com.annajohnson.flooring.product;

import java.math.BigDecimal;

/** The checked values from the admin Add/Edit product form, ready to save. The photo is handled separately. */
public record ProductForm(String name, String description, String category, String manufacturer, String style,
		String color, BigDecimal unitPrice, String pricingUnit, String dimensions, BigDecimal coveragePerBox) {
}
