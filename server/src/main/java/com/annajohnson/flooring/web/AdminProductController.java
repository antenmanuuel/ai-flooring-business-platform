package com.annajohnson.flooring.web;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.annajohnson.flooring.product.Product;
import com.annajohnson.flooring.product.ProductForm;
import com.annajohnson.flooring.product.ProductRepository;
import com.annajohnson.flooring.upload.ImageStorage;

/**
 * The admin Products page. Add and Edit send the form as multipart/form-data so it can carry an
 * optional "image" file. Every path here needs a logged-in admin (enforced in WebConfig).
 */
@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

	private static final String PRODUCT_NOT_FOUND = "Product not found.";
	private static final List<String> PRICING_UNITS = List.of("sq ft", "box", "piece", "roll");
	// The largest value DECIMAL(10,2) can hold.
	private static final BigDecimal MAX_PRICE = new BigDecimal("99999999.99");
	// The largest value DECIMAL(8,2) can hold.
	private static final BigDecimal MAX_COVERAGE = new BigDecimal("999999.99");
	// A plain number with at most 2 decimal places, e.g. 7, 7.5 or 7.50 (so nothing gets rounded when saved).
	private static final Pattern MONEY_PATTERN = Pattern.compile("^\\d+(\\.\\d{1,2})?$");

	private final ProductRepository products;
	private final ImageStorage images;

	public AdminProductController(ProductRepository products, ImageStorage images) {
		this.products = products;
		this.images = images;
	}

	/** The whole catalog. */
	@GetMapping
	public List<Product> list() {
		return products.findAll();
	}

	@PostMapping
	public ResponseEntity<Product> create(@RequestParam Map<String, String> form,
			@RequestParam(value = "image", required = false) MultipartFile image) {
		ProductForm product = validate(form, image);
		String imageUrl = hasFile(image) ? images.save(ImageStorage.PRODUCTS, image) : null;
		long id;
		try {
			id = products.insert(product, imageUrl);
		}
		catch (RuntimeException ex) {
			images.delete(imageUrl); // don't keep a photo for a product that wasn't saved
			throw ex;
		}
		return ResponseEntity.status(HttpStatus.CREATED).body(products.findById(id).orElseThrow());
	}

	/**
	 * A new "image" file replaces the old photo; removeImage = "true" clears it; otherwise the
	 * current photo stays.
	 */
	@PutMapping("/{id}")
	public Product update(@PathVariable String id, @RequestParam Map<String, String> form,
			@RequestParam(value = "image", required = false) MultipartFile image) {
		long productId = PathIds.parse(id, PRODUCT_NOT_FOUND);
		Product existing = products.findById(productId).orElseThrow(() -> ApiException.notFound(PRODUCT_NOT_FOUND));
		ProductForm product = validate(form, image);

		String imageUrl;
		if (hasFile(image)) imageUrl = images.save(ImageStorage.PRODUCTS, image);
		else if ("true".equals(form.get("removeImage"))) imageUrl = null;
		else imageUrl = existing.imageUrl();

		try {
			products.update(productId, product, imageUrl);
		}
		catch (RuntimeException ex) {
			if (hasFile(image)) images.delete(imageUrl);
			throw ex;
		}
		// The old photo isn't used any more once it's replaced or removed.
		if (!Objects.equals(existing.imageUrl(), imageUrl)) {
			images.delete(existing.imageUrl());
		}
		return products.findById(productId).orElseThrow();
	}

	/** Removes a product and its photo. */
	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable String id) {
		long productId = PathIds.parse(id, PRODUCT_NOT_FOUND);
		Product existing = products.findById(productId).orElseThrow(() -> ApiException.notFound(PRODUCT_NOT_FOUND));
		try {
			products.delete(productId);
		}
		catch (DataIntegrityViolationException ex) {
			// Quote requests that use this product must be kept, so the foreign key blocks the delete.
			throw new ApiException(HttpStatus.CONFLICT,
					"\"" + existing.name() + "\" is used in quote requests, so it can't be removed.");
		}
		images.delete(existing.imageUrl());
		return ResponseEntity.noContent().build();
	}

	/** Checks the Add/Edit form and the photo. Throws a 400 with every field error, or returns the cleaned values. */
	private ProductForm validate(Map<String, String> form, MultipartFile image) {
		Map<String, String> errors = new LinkedHashMap<>();

		String name = required(errors, form, "name", "Name", 100);
		String category = required(errors, form, "category", "Category", 50);
		String manufacturer = required(errors, form, "manufacturer", "Manufacturer", 100);
		String style = required(errors, form, "style", "Material / style", 100);
		String color = required(errors, form, "color", "Color", 50);

		String dimensions = text(form, "dimensions");
		if (dimensions.length() > 50) errors.put("dimensions", "Dimensions must be 50 characters or fewer.");

		String description = text(form, "description");
		if (description.length() > 2000) errors.put("description", "Description must be 2000 characters or fewer.");

		String priceText = text(form, "unitPrice");
		BigDecimal price = parseNumber(priceText);
		if (price == null) errors.put("unitPrice", "Unit price is required.");
		else if (price.signum() < 0) errors.put("unitPrice", "Unit price can't be negative.");
		else if (!MONEY_PATTERN.matcher(priceText).matches())
			errors.put("unitPrice", "Enter a price like 7.50 (up to 2 decimal places).");
		else if (price.compareTo(MAX_PRICE) > 0) errors.put("unitPrice", "Unit price is too large.");

		String pricingUnit = text(form, "pricingUnit");
		if (pricingUnit.isEmpty()) pricingUnit = "sq ft";
		if (!PRICING_UNITS.contains(pricingUnit)) errors.put("pricingUnit", "Choose a valid pricing unit.");

		String coverageText = text(form, "coveragePerBox");
		BigDecimal coverage = null;
		if (!coverageText.isEmpty()) {
			coverage = parseNumber(coverageText);
			if (coverage == null || !MONEY_PATTERN.matcher(coverageText).matches()
					|| coverage.compareTo(MAX_COVERAGE) > 0) {
				errors.put("coveragePerBox",
						"Coverage must be a number between 0 and 999,999.99, with up to 2 decimal places.");
			}
		}

		if (hasFile(image)) {
			String problem = images.problemWith(image);
			if (problem != null) errors.put("image", problem);
		}

		if (!errors.isEmpty()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Please fix the highlighted fields.", errors);
		}
		return new ProductForm(name, description.isEmpty() ? null : description, category, manufacturer, style, color,
				price, pricingUnit, dimensions.isEmpty() ? null : dimensions, coverage);
	}

	private static boolean hasFile(MultipartFile file) {
		return file != null && !file.isEmpty();
	}

	private static String text(Map<String, String> form, String key) {
		String value = form.get(key);
		return value == null ? "" : value.strip();
	}

	private static String required(Map<String, String> errors, Map<String, String> form, String field, String label,
			int max) {
		String value = text(form, field);
		if (value.isEmpty()) errors.put(field, label + " is required.");
		else if (value.length() > max) errors.put(field, label + " must be " + max + " characters or fewer.");
		return value;
	}

	private static BigDecimal parseNumber(String text) {
		try {
			return text.isEmpty() ? null : new BigDecimal(text);
		}
		catch (NumberFormatException ex) {
			return null;
		}
	}
}
