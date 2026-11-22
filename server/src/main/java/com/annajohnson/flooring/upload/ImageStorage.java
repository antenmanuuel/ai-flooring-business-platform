package com.annajohnson.flooring.upload;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Saves uploaded photos under server/uploads and builds the URLs they're served at
 * (see WebConfig):
 * <ul>
 * <li>product photos: uploads/products, served at /api/uploads/products/&lt;file&gt;</li>
 * <li>request photos: uploads/requests, served at /api/uploads/requests/&lt;file&gt;</li>
 * </ul>
 * The folder is relative to the working directory, so the server must be started from server/.
 */
@Component
public class ImageStorage {

	public static final Path UPLOADS_DIR = Path.of("uploads").toAbsolutePath();
	public static final String URL_PREFIX = "/api/uploads/";
	public static final String PRODUCTS = "products";
	public static final String REQUESTS = "requests";

	public static final long MAX_BYTES = 5L * 1024 * 1024;
	public static final int MAX_REQUEST_PHOTOS = 5;

	// Allowed image types and the extension each one is saved with.
	private static final Map<String, String> IMAGE_TYPES = Map.of("image/jpeg", ".jpg", "image/png", ".png",
			"image/webp", ".webp");

	private static final byte[] PNG_SIGNATURE = { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n' };

	private static final Logger log = LoggerFactory.getLogger(ImageStorage.class);

	/**
	 * The problem with an uploaded file, shown under the form field, or null if it's fine. The type
	 * the browser reports is checked against the file's first bytes, so a renamed file of another kind
	 * is rejected.
	 */
	public String problemWith(MultipartFile file) {
		String notAnImage = "Image must be a JPG, PNG or WebP file.";
		if (!IMAGE_TYPES.containsKey(file.getContentType())) {
			return notAnImage;
		}
		if (file.getSize() > MAX_BYTES) {
			return "Image must be 5 MB or smaller.";
		}
		if (!startsLike(file, file.getContentType())) {
			return notAnImage;
		}
		return null;
	}

	/** Whether the file starts with the signature of its claimed image type. */
	private static boolean startsLike(MultipartFile file, String type) {
		byte[] head = new byte[12];
		int read;
		try (InputStream in = file.getInputStream()) {
			read = in.readNBytes(head, 0, head.length);
		}
		catch (IOException ex) {
			return false;
		}
		return switch (type) {
			// JPEG: FF D8 FF
			case "image/jpeg" -> read >= 3 && (head[0] & 0xFF) == 0xFF && (head[1] & 0xFF) == 0xD8 && (head[2] & 0xFF) == 0xFF;
			// PNG: 89 'P' 'N' 'G' CR LF 1A LF
			case "image/png" -> read >= 8 && Arrays.equals(Arrays.copyOf(head, 8), PNG_SIGNATURE);
			// WebP: "RIFF" <size> "WEBP"
			case "image/webp" -> read >= 12 && ascii(head, 0, "RIFF") && ascii(head, 8, "WEBP");
			default -> false;
		};
	}

	private static boolean ascii(byte[] bytes, int offset, String text) {
		return Arrays.equals(Arrays.copyOfRange(bytes, offset, offset + text.length()),
				text.getBytes(StandardCharsets.US_ASCII));
	}

	/**
	 * Saves a checked image into uploads/&lt;folder&gt; under a new random name (so two photos
	 * called "floor.jpg" don't overwrite each other) and returns the URL to store in the database.
	 */
	public String save(String folder, MultipartFile file) {
		Path dir = UPLOADS_DIR.resolve(folder);
		String name = UUID.randomUUID() + IMAGE_TYPES.get(file.getContentType());
		try (InputStream in = file.getInputStream()) {
			Files.createDirectories(dir);
			Files.copy(in, dir.resolve(name));
		}
		catch (IOException ex) {
			throw new UncheckedIOException("Could not save the uploaded image.", ex);
		}
		return URL_PREFIX + folder + "/" + name;
	}

	/** Deletes a saved photo. Does nothing for a null URL or a file that's already gone. */
	public void delete(String imageUrl) {
		if (imageUrl == null || !imageUrl.startsWith(URL_PREFIX)) {
			return;
		}
		Path file = UPLOADS_DIR.resolve(imageUrl.substring(URL_PREFIX.length())).normalize();
		if (!file.startsWith(UPLOADS_DIR)) {
			return;
		}
		try {
			Files.deleteIfExists(file);
		}
		catch (IOException ex) {
			log.warn("Could not delete {}", file, ex);
		}
	}

	public void deleteAll(List<String> imageUrls) {
		imageUrls.forEach(this::delete);
	}
}
