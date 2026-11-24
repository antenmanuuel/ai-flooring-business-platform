package com.annajohnson.flooring.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.annajohnson.flooring.auth.AdminInterceptor;
import com.annajohnson.flooring.auth.AuthInterceptor;
import com.annajohnson.flooring.auth.ClientInterceptor;
import com.annajohnson.flooring.upload.ImageStorage;

@Configuration
public class WebConfig implements WebMvcConfigurer {

	private final AuthInterceptor authInterceptor;
	private final AdminInterceptor adminInterceptor;
	private final ClientInterceptor clientInterceptor;
	private final ImageStorage images;

	public WebConfig(AuthInterceptor authInterceptor, AdminInterceptor adminInterceptor,
			ClientInterceptor clientInterceptor, ImageStorage images) {
		this.authInterceptor = authInterceptor;
		this.adminInterceptor = adminInterceptor;
		this.clientInterceptor = clientInterceptor;
		this.images = images;
	}

	/** Which paths need a login, an admin, or a client. Interceptors run in the order added. */
	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(authInterceptor).addPathPatterns("/api/auth/me", "/api/admin/**", "/api/client/**",
				ImageStorage.URL_PREFIX + ImageStorage.REQUESTS + "/**");
		registry.addInterceptor(adminInterceptor).addPathPatterns("/api/admin/**");
		registry.addInterceptor(clientInterceptor).addPathPatterns("/api/client/**");
	}

	/**
	 * Product photos, /api/uploads/products/&lt;file&gt; (saved by ImageStorage). Public, like the catalog.
	 * Quote request photos are private and served by RequestPhotoController instead.
	 */
	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		// A folder location must end in "/"; toUri() only adds it when the folder already exists.
		String location = images.uploadsDir().resolve(ImageStorage.PRODUCTS).toUri().toString();
		registry.addResourceHandler(ImageStorage.URL_PREFIX + ImageStorage.PRODUCTS + "/**")
			.addResourceLocations(location.endsWith("/") ? location : location + "/");
	}

	/** In development the Vite dev server proxies /api, so the browser never makes cross-origin calls. */
	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/api/**").allowedMethods("GET", "HEAD", "PUT", "PATCH", "POST", "DELETE");
	}
}
