package com.annajohnson.flooring.web;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.annajohnson.flooring.BusinessTime;
import com.annajohnson.flooring.auth.AuthInterceptor;
import com.annajohnson.flooring.client.ClientRow;
import com.annajohnson.flooring.product.ProductRepository;
import com.annajohnson.flooring.request.NewRequest;
import com.annajohnson.flooring.request.RequestDetails;
import com.annajohnson.flooring.request.RequestRepository;
import com.annajohnson.flooring.request.RequestSummary;
import com.annajohnson.flooring.upload.ImageStorage;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/** A client's quote requests. Every path here needs a logged-in client (enforced in WebConfig). */
@RestController
@RequestMapping("/api/client/requests")
public class ClientRequestController {

	private static final List<String> PATTERNS = List.of("Straight", "Diagonal", "Herringbone", "Chevron");
	private static final int MAX_ROOMS = 20;
	// A plain number with at most 2 decimal places, e.g. 12, 12.5 or 12.50.
	private static final Pattern NUMBER_PATTERN = Pattern.compile("^\\d+(\\.\\d{1,2})?$");
	private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");
	private static final BigDecimal MAX_AREA = new BigDecimal("9999999.99");

	private final RequestRepository requests;
	private final ProductRepository products;
	private final ImageStorage images;
	private final JsonMapper json;
	private final BusinessTime businessTime;

	public ClientRequestController(RequestRepository requests, ProductRepository products, ImageStorage images,
			JsonMapper json, BusinessTime businessTime) {
		this.requests = requests;
		this.products = products;
		this.images = images;
		this.json = json;
		this.businessTime = businessTime;
	}

	public record CreatedResponse(long id) {
	}

	/**
	 * Sends a quote request. multipart/form-data: "data" holds the form as JSON and "photos" holds
	 * up to 5 image files. Nothing is saved unless the whole form is valid.
	 */
	@PostMapping
	public ResponseEntity<CreatedResponse> create(@RequestAttribute(AuthInterceptor.CURRENT_CLIENT) ClientRow client,
			@RequestParam("data") String data,
			@RequestParam(value = "photos", required = false) List<MultipartFile> photos) {
		Map<String, Object> form;
		try {
			form = json.readValue(data, Map.class);
		}
		catch (JacksonException ex) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid request.");
		}
		if (form == null) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid request.");
		}

		Map<String, String> errors = new LinkedHashMap<>();
		NewRequest request = validate(client.id(), form, errors);

		List<MultipartFile> files = photos == null ? List.of() : photos.stream().filter(f -> !f.isEmpty()).toList();
		if (files.size() > ImageStorage.MAX_REQUEST_PHOTOS) {
			errors.put("photos", "You can add up to " + ImageStorage.MAX_REQUEST_PHOTOS + " photos.");
		}
		else {
			for (MultipartFile file : files) {
				String problem = images.problemWith(file);
				if (problem != null) {
					errors.put("photos", problem);
					break;
				}
			}
		}

		if (!errors.isEmpty()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Please fix the highlighted fields.", errors);
		}

		List<String> photoUrls = new ArrayList<>();
		try {
			for (MultipartFile file : files) {
				photoUrls.add(images.save(ImageStorage.REQUESTS, file));
			}
			long id = requests.insert(request, photoUrls);
			return ResponseEntity.status(HttpStatus.CREATED).body(new CreatedResponse(id));
		}
		catch (RuntimeException ex) {
			images.deleteAll(photoUrls); // don't keep photos for a request that wasn't saved
			throw ex;
		}
	}

	/** The logged-in client's requests, newest first, for "Your projects". */
	@GetMapping
	public Map<String, List<RequestSummary>> list(@RequestAttribute(AuthInterceptor.CURRENT_CLIENT) ClientRow client) {
		return Map.of("requests", requests.findSummariesByClient(client.id()));
	}

	/** One of the client's own requests, with its rooms and photos. */
	@GetMapping("/{id}")
	public Map<String, RequestDetails> get(@RequestAttribute(AuthInterceptor.CURRENT_CLIENT) ClientRow client,
			@PathVariable String id) {
		String notFound = "Project not found.";
		RequestDetails request = requests.findForClient(PathIds.parse(id, notFound), client.id())
			.orElseThrow(() -> ApiException.notFound(notFound));
		return Map.of("request", request);
	}

	/**
	 * Checks the whole form, adding messages to {@code errors}; room fields are named like
	 * "rooms.0.name" so the form can show each one under its input.
	 */
	private NewRequest validate(long clientId, Map<String, Object> form, Map<String, String> errors) {
		String address = text(form.get("address"));
		if (address.isEmpty()) errors.put("address", "Service address is required.");
		else if (address.length() > 255) errors.put("address", "Service address must be 255 characters or fewer.");

		LocalDate preferredDate = null;
		String dateText = text(form.get("preferredDate"));
		if (!dateText.isEmpty()) {
			try {
				if (!DATE_PATTERN.matcher(dateText).matches()) throw new DateTimeParseException("", dateText, 0);
				preferredDate = LocalDate.parse(dateText);
				if (preferredDate.isBefore(businessTime.today())) {
					errors.put("preferredDate", "The installation date can't be in the past.");
				}
			}
			catch (DateTimeParseException ex) {
				errors.put("preferredDate", "Enter a valid date.");
			}
		}

		BigDecimal budget = readNumber(errors, "budget", form.get("budget"), "Budget", new BigDecimal("99999999.99"));

		String notes = text(form.get("notes"));
		if (notes.length() > 2000) errors.put("notes", "Notes must be 2000 characters or fewer.");

		List<?> rawRooms = form.get("rooms") instanceof List<?> list ? list : List.of();
		if (rawRooms.isEmpty()) errors.put("rooms", "Add at least one room.");
		else if (rawRooms.size() > MAX_ROOMS) errors.put("rooms", "You can add up to " + MAX_ROOMS + " rooms.");

		List<NewRequest.Room> rooms = new ArrayList<>();
		for (int i = 0; i < Math.min(rawRooms.size(), MAX_ROOMS); i++) {
			Map<?, ?> room = rawRooms.get(i) instanceof Map<?, ?> map ? map : Map.of();
			rooms.add(validateRoom(errors, "rooms." + i + ".", room));
		}

		// Every chosen product must still be in the catalog.
		Set<Long> productIds = new LinkedHashSet<>();
		rooms.forEach(room -> {
			if (room.productId() > 0) productIds.add(room.productId());
		});
		Set<Long> existing = products.findExistingIds(productIds);
		for (int i = 0; i < rooms.size(); i++) {
			long productId = rooms.get(i).productId();
			if (productId > 0 && !existing.contains(productId)) {
				errors.put("rooms." + i + ".productId", "This product is no longer available. Choose another.");
			}
		}

		return new NewRequest(clientId, address, preferredDate, budget, notes.isEmpty() ? null : notes, rooms);
	}

	private NewRequest.Room validateRoom(Map<String, String> errors, String prefix, Map<?, ?> room) {
		String name = text(room.get("name"));
		if (name.isEmpty()) errors.put(prefix + "name", "Room name is required.");
		else if (name.length() > 100) errors.put(prefix + "name", "Room name must be 100 characters or fewer.");

		long productId = readId(room.get("productId"));
		if (productId <= 0) errors.put(prefix + "productId", "Choose a flooring product.");

		int errorCount = errors.size();
		BigDecimal length = readNumber(errors, prefix + "length", room.get("length"), "Length", new BigDecimal("99999.99"));
		BigDecimal width = readNumber(errors, prefix + "width", room.get("width"), "Width", new BigDecimal("99999.99"));
		BigDecimal area = readNumber(errors, prefix + "area", room.get("area"), "Area", MAX_AREA);
		boolean numbersOk = errors.size() == errorCount;

		// The total area wins if it was typed in; otherwise length × width.
		BigDecimal areaSqft = null;
		if (area != null) areaSqft = area;
		else if (length != null && width != null) areaSqft = length.multiply(width).setScale(2, RoundingMode.HALF_UP);
		if (numbersOk) {
			if (areaSqft == null || areaSqft.signum() <= 0) {
				errors.put(prefix + "area", "Enter the length and width, or the total area.");
			}
			else if (areaSqft.compareTo(MAX_AREA) > 0) {
				errors.put(prefix + "area", "Area is too large.");
			}
		}

		String currentFlooring = text(room.get("currentFlooring"));
		if (currentFlooring.length() > 100) {
			errors.put(prefix + "currentFlooring", "Current flooring must be 100 characters or fewer.");
		}

		String pattern = text(room.get("pattern"));
		if (pattern.isEmpty()) pattern = "Straight";
		if (!PATTERNS.contains(pattern)) errors.put(prefix + "pattern", "Choose a valid installation pattern.");

		return new NewRequest.Room(name, productId, length, width, areaSqft,
				currentFlooring.isEmpty() ? null : currentFlooring, Boolean.TRUE.equals(room.get("removeExisting")),
				pattern);
	}

	/** Non-string values (numbers, null, missing) are treated as empty. */
	private static String text(Object value) {
		return value instanceof String s ? s.strip() : "";
	}

	/** A positive whole number from a string like "3" or a JSON number, or 0. */
	private static long readId(Object value) {
		String raw = value == null ? "" : String.valueOf(value).strip();
		try {
			return raw.matches("\\d{1,10}") ? Long.parseLong(raw) : 0;
		}
		catch (NumberFormatException ex) {
			return 0;
		}
	}

	/** Checks an optional number field. Returns null when it's empty or has an error. */
	private static BigDecimal readNumber(Map<String, String> errors, String field, Object value, String label,
			BigDecimal max) {
		if (value == null || "".equals(value)) {
			return null;
		}
		String raw = String.valueOf(value).strip();
		if (!NUMBER_PATTERN.matcher(raw).matches()) {
			errors.put(field, label + " must be a number with up to 2 decimal places.");
			return null;
		}
		BigDecimal number = new BigDecimal(raw);
		if (number.compareTo(max) > 0) {
			errors.put(field, label + " is too large.");
			return null;
		}
		return number;
	}
}
