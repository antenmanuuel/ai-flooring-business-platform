package com.annajohnson.flooring.web;

/** Reads a numeric id from a URL path. */
final class PathIds {

	private PathIds() {
	}

	/** Ids that aren't whole numbers can't match any row, so they get the same 404 as a missing one. */
	static long parse(String id, String notFoundMessage) {
		try {
			return Long.parseLong(id);
		}
		catch (NumberFormatException ex) {
			throw ApiException.notFound(notFoundMessage);
		}
	}
}
