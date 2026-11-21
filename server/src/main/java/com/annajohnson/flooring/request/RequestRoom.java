package com.annajohnson.flooring.request;

import java.math.BigDecimal;

/** One room of a saved quote request, with the flooring product the client picked. */
public record RequestRoom(long id, String name, String productName, BigDecimal unitPrice, String pricingUnit,
		BigDecimal length, BigDecimal width, BigDecimal area, String currentFlooring, boolean removeExisting,
		String pattern) {
}
