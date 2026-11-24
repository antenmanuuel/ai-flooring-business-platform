package com.annajohnson.flooring.request;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * Every SQL query on the Request, RequestRoom and RequestPhoto tables. A request's rooms and photos
 * are loaded with separate simple queries and joined here by request_id.
 */
@Repository
public class RequestRepository {

	// Columns of a request; preferred_date as plain text so it can't shift a day by time zone.
	private static final String REQUEST_COLUMNS = """
			r.request_id, r.service_address, DATE_FORMAT(r.preferred_date, '%Y-%m-%d') AS preferred_date,
			r.budget, r.notes, r.status, r.created_at""";

	private static final String ROOM_QUERY = """
			SELECT rr.room_id, rr.request_id, rr.name, rr.length_ft, rr.width_ft, rr.area_sqft,
			       rr.current_flooring, rr.remove_existing, rr.pattern,
			       p.name AS product_name, p.unit_price, p.pricing_unit
			FROM RequestRoom rr
			JOIN Product p ON p.product_id = rr.product_id
			""";

	// One line per request with its room count, total area and room names, newest first.
	private static final String SUMMARY_QUERY = """
			SELECT r.request_id, r.status, r.created_at,
			       COUNT(rr.room_id) AS room_count,
			       SUM(rr.area_sqft) AS total_area,
			       GROUP_CONCAT(rr.name ORDER BY rr.room_id SEPARATOR ', ') AS room_names
			FROM Request r
			JOIN RequestRoom rr ON rr.request_id = r.request_id
			WHERE r.client_id = ?
			GROUP BY r.request_id
			ORDER BY r.created_at DESC, r.request_id DESC""";

	private final JdbcClient jdbc;

	public RequestRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	/**
	 * Saves a request with its rooms and photo URLs in one transaction, so a request is never
	 * saved without its rooms. Returns the new request number.
	 */
	@Transactional
	public long insert(NewRequest request, List<String> photoUrls) {
		KeyHolder keys = new GeneratedKeyHolder();
		jdbc.sql("""
				INSERT INTO Request (client_id, service_address, preferred_date, budget, notes)
				VALUES (?, ?, ?, ?, ?)""")
			.params(request.clientId(), request.serviceAddress(), request.preferredDate(), request.budget(),
					request.notes())
			.update(keys);
		long requestId = keys.getKey().longValue();

		for (NewRequest.Room room : request.rooms()) {
			jdbc.sql("""
					INSERT INTO RequestRoom
					  (request_id, name, product_id, length_ft, width_ft, area_sqft, current_flooring, remove_existing, pattern)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""")
				.params(requestId, room.name(), room.productId(), room.length(), room.width(), room.areaSqft(),
						room.currentFlooring(), room.removeExisting(), room.pattern())
				.update();
		}
		for (String url : photoUrls) {
			jdbc.sql("INSERT INTO RequestPhoto (request_id, image_url) VALUES (?, ?)").params(requestId, url).update();
		}
		return requestId;
	}

	/** A client's own requests, newest first. */
	public List<RequestSummary> findSummariesByClient(long clientId) {
		return jdbc.sql(SUMMARY_QUERY)
			.param(clientId)
			.query((rs, n) -> new RequestSummary(rs.getLong("request_id"), rs.getString("status"),
					rs.getTimestamp("created_at").toInstant(), rs.getInt("room_count"), rs.getBigDecimal("total_area"),
					rs.getString("room_names")))
			.list();
	}

	/**
	 * One of a client's own requests. "AND client_id = ?" means a client can't open someone else's
	 * request by changing the number.
	 */
	public Optional<RequestDetails> findForClient(long requestId, long clientId) {
		Optional<RequestRow> row = jdbc
			.sql("SELECT " + REQUEST_COLUMNS + " FROM Request r WHERE r.request_id = ? AND r.client_id = ?")
			.params(requestId, clientId)
			.query((rs, n) -> mapRequestRow(rs, null))
			.optional();
		return row.map(r -> {
			List<RequestRoom> rooms = jdbc.sql(ROOM_QUERY + "WHERE rr.request_id = ? ORDER BY rr.room_id")
				.param(requestId)
				.query(RequestRepository::mapRoom)
				.list();
			List<String> photos = jdbc.sql("SELECT image_url FROM RequestPhoto WHERE request_id = ? ORDER BY photo_id")
				.param(requestId)
				.query(String.class)
				.list();
			return r.withRooms(rooms, photos);
		});
	}

	/**
	 * Requests with their client, rooms and photos, newest first (admin): every request, or only the newest
	 * {@code limit}. Rooms and photos are loaded only for the requests returned.
	 */
	public List<RequestDetails> findAllWithClients(Integer limit) {
		List<RequestRow> requests = jdbc.sql("SELECT " + REQUEST_COLUMNS + """
				, c.client_id, c.first_name, c.last_name, c.email, c.phone
				FROM Request r
				JOIN Client c ON c.client_id = r.client_id
				ORDER BY r.created_at DESC, r.request_id DESC""" + (limit == null ? "" : " LIMIT " + limit))
			.query((rs, n) -> mapRequestRow(rs, new RequestClient(rs.getLong("client_id"), rs.getString("first_name"),
					rs.getString("last_name"), rs.getString("email"), rs.getString("phone"))))
			.list();
		if (requests.isEmpty()) {
			return List.of();
		}
		List<Long> ids = requests.stream().map(RequestRow::id).toList();
		Map<Long, List<RequestRoom>> rooms = jdbc.sql(ROOM_QUERY + "WHERE rr.request_id IN (:ids) ORDER BY rr.room_id")
			.param("ids", ids)
			.query((rs, n) -> Map.entry(rs.getLong("request_id"), mapRoom(rs, n)))
			.list()
			.stream()
			.collect(Collectors.groupingBy(Map.Entry::getKey,
					Collectors.mapping(Map.Entry::getValue, Collectors.toList())));
		Map<Long, List<String>> photos = jdbc
			.sql("SELECT request_id, image_url FROM RequestPhoto WHERE request_id IN (:ids) ORDER BY photo_id")
			.param("ids", ids)
			.query((rs, n) -> Map.entry(rs.getLong("request_id"), rs.getString("image_url")))
			.list()
			.stream()
			.collect(Collectors.groupingBy(Map.Entry::getKey,
					Collectors.mapping(Map.Entry::getValue, Collectors.toList())));

		return requests.stream()
			.map(r -> r.withRooms(rooms.getOrDefault(r.id(), List.of()), photos.getOrDefault(r.id(), List.of())))
			.toList();
	}

	/** The client who sent the request a photo belongs to, if the photo exists. */
	public Optional<Long> findPhotoOwner(String imageUrl) {
		return jdbc.sql("""
				SELECT r.client_id
				FROM RequestPhoto rp
				JOIN Request r ON r.request_id = rp.request_id
				WHERE rp.image_url = ?""")
			.param(imageUrl)
			.query(Long.class)
			.optional();
	}

	/** Requests still waiting for the admin's first quote, oldest first. */
	public List<NewRequestNotice> findPending() {
		return jdbc.sql("""
				SELECT r.request_id, c.first_name, c.last_name
				FROM Request r
				JOIN Client c ON c.client_id = r.client_id
				WHERE r.status = 'pending'
				ORDER BY r.created_at""")
			.query((rs, n) -> new NewRequestNotice(rs.getLong("request_id"), rs.getString("first_name"),
					rs.getString("last_name")))
			.list();
	}

	/** A Request row (plus its client for the admin) before its rooms and photos are added. */
	private record RequestRow(long id, String status, Instant createdAt, String serviceAddress, String preferredDate,
			BigDecimal budget, String notes, RequestClient client) {

		RequestDetails withRooms(List<RequestRoom> rooms, List<String> photos) {
			BigDecimal totalArea = rooms.stream().map(RequestRoom::area).reduce(BigDecimal.ZERO, BigDecimal::add);
			return new RequestDetails(id, status, createdAt, serviceAddress, preferredDate, budget, notes, client,
					totalArea, rooms, photos);
		}
	}

	private static RequestRow mapRequestRow(ResultSet rs, RequestClient client) throws SQLException {
		return new RequestRow(rs.getLong("request_id"), rs.getString("status"), rs.getTimestamp("created_at").toInstant(),
				rs.getString("service_address"), rs.getString("preferred_date"), rs.getBigDecimal("budget"),
				rs.getString("notes"), client);
	}

	private static RequestRoom mapRoom(ResultSet rs, int rowNum) throws SQLException {
		return new RequestRoom(rs.getLong("room_id"), rs.getString("name"), rs.getString("product_name"),
				rs.getBigDecimal("unit_price"), rs.getString("pricing_unit"), rs.getBigDecimal("length_ft"),
				rs.getBigDecimal("width_ft"), rs.getBigDecimal("area_sqft"), rs.getString("current_flooring"),
				rs.getBoolean("remove_existing"), rs.getString("pattern"));
	}
}
