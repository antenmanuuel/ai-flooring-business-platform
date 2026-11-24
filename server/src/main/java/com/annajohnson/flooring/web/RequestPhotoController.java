package com.annajohnson.flooring.web;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RestController;

import com.annajohnson.flooring.auth.AuthInterceptor;
import com.annajohnson.flooring.client.ClientRow;
import com.annajohnson.flooring.request.RequestRepository;
import com.annajohnson.flooring.upload.ImageStorage;

/**
 * Photos attached to quote requests show the inside of clients' homes, so unlike product photos they
 * aren't public: only the client who sent the request and the admin can see them. Needs a login
 * (AuthInterceptor, set in WebConfig); everyone else gets the same 404 as for a missing photo.
 */
@RestController
public class RequestPhotoController {

	// The names ImageStorage.save gives files: a random UUID and the image type's extension.
	private static final Pattern FILE_NAME = Pattern.compile("^[0-9a-f-]{36}\\.(jpg|png|webp)$");
	private static final Map<String, MediaType> TYPES = Map.of("jpg", MediaType.IMAGE_JPEG, "png", MediaType.IMAGE_PNG,
			"webp", MediaType.parseMediaType("image/webp"));
	private static final String NOT_FOUND = "Photo not found.";

	private final RequestRepository requests;
	private final ImageStorage images;

	public RequestPhotoController(RequestRepository requests, ImageStorage images) {
		this.requests = requests;
		this.images = images;
	}

	@GetMapping(ImageStorage.URL_PREFIX + ImageStorage.REQUESTS + "/{file}")
	public ResponseEntity<Resource> get(@RequestAttribute(AuthInterceptor.CURRENT_CLIENT) ClientRow viewer,
			@PathVariable String file) {
		if (!FILE_NAME.matcher(file).matches()) {
			throw ApiException.notFound(NOT_FOUND);
		}
		String url = ImageStorage.URL_PREFIX + ImageStorage.REQUESTS + "/" + file;
		long owner = requests.findPhotoOwner(url).orElseThrow(() -> ApiException.notFound(NOT_FOUND));
		if (!viewer.isAdmin() && viewer.id() != owner) {
			throw ApiException.notFound(NOT_FOUND);
		}
		Path path = images.uploadsDir().resolve(ImageStorage.REQUESTS).resolve(file);
		if (!Files.isRegularFile(path)) {
			throw ApiException.notFound(NOT_FOUND);
		}
		String extension = file.substring(file.lastIndexOf('.') + 1);
		return ResponseEntity.ok()
			.contentType(TYPES.get(extension))
			// Only the viewer's own browser may cache it, never a shared proxy.
			.cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
			.body(new FileSystemResource(path));
	}
}
