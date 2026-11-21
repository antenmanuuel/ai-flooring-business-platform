package com.annajohnson.flooring.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** A checked quote request, ready to insert. */
public record NewRequest(long clientId, String serviceAddress, LocalDate preferredDate, BigDecimal budget,
		String notes, List<Room> rooms) {

	/** areaSqft is the total area the client typed in, or length × width. */
	public record Room(String name, long productId, BigDecimal length, BigDecimal width, BigDecimal areaSqft,
			String currentFlooring, boolean removeExisting, String pattern) {
	}
}
