package com.annajohnson.flooring.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.annajohnson.flooring.product.CatalogProduct;
import com.annajohnson.flooring.product.ProductRepository;

/** The public flooring catalog. No login needed, so it only returns what visitors should see. */
@RestController
@RequestMapping("/api")
public class CatalogController {

	private final ProductRepository products;

	public CatalogController(ProductRepository products) {
		this.products = products;
	}

	/** The home page's "Materials we install" section and the product list on the quote request form. */
	@GetMapping("/products")
	public List<CatalogProduct> catalog() {
		return products.findCatalog();
	}
}
