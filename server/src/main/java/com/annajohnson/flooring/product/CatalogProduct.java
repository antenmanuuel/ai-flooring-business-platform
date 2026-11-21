package com.annajohnson.flooring.product;

import java.math.BigDecimal;

/**
 * What visitors see of a product: the home page's "Materials we install" section and the product
 * list on the quote request form (coveragePerBox is for its estimate).
 */
public record CatalogProduct(long productId, String name, String category, BigDecimal unitPrice, String pricingUnit,
		BigDecimal coveragePerBox, String imageUrl) {
}
