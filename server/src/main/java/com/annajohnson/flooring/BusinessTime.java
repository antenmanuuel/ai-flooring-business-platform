package com.annajohnson.flooring;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The business's local time (app.time-zone, Detroit by default). Servers and managed databases
 * usually run on UTC, which is a different date from Detroit every evening, so "today" and the time
 * of day always go through here.
 */
@Component
public class BusinessTime {

	private final ZoneId zone;

	public BusinessTime(@Value("${app.time-zone:America/Detroit}") String zone) {
		this.zone = ZoneId.of(zone);
	}

	public LocalDate today() {
		return LocalDate.now(zone);
	}

	/** The zone's current offset from UTC, e.g. "-05:00" (MySQL's CONVERT_TZ accepts offsets without time zone tables). */
	public String utcOffset() {
		ZoneOffset offset = zone.getRules().getOffset(java.time.Instant.now());
		return offset.getTotalSeconds() == 0 ? "+00:00" : offset.getId();
	}
}
