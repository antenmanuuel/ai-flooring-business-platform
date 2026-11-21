package com.annajohnson.flooring.product;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

/** Every SQL query on the Product table. Values always go in as placeholders, never string-built. */
@Repository
public class ProductRepository {

	private final JdbcClient jdbc;

	public ProductRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	/** The public catalog, cheapest first within each category. */
	public List<CatalogProduct> findCatalog() {
		return jdbc.sql("""
				SELECT product_id, name, category, unit_price, pricing_unit, coverage_per_box, image_url
				FROM Product
				ORDER BY category ASC, unit_price ASC""")
			.query((rs, n) -> new CatalogProduct(rs.getLong("product_id"), rs.getString("name"),
					rs.getString("category"), rs.getBigDecimal("unit_price"), rs.getString("pricing_unit"),
					rs.getBigDecimal("coverage_per_box"), rs.getString("image_url")))
			.list();
	}

	public List<Product> findAll() {
		return jdbc.sql("SELECT * FROM Product ORDER BY product_id ASC").query(ProductRepository::mapProduct).list();
	}

	public Optional<Product> findById(long id) {
		return jdbc.sql("SELECT * FROM Product WHERE product_id = ?")
			.param(id)
			.query(ProductRepository::mapProduct)
			.optional();
	}

	/** Which of the given ids are still in the catalog. */
	public Set<Long> findExistingIds(Collection<Long> ids) {
		if (ids.isEmpty()) {
			return Set.of();
		}
		return jdbc.sql("SELECT product_id FROM Product WHERE product_id IN (:ids)")
			.param("ids", ids)
			.query((rs, n) -> rs.getLong("product_id"))
			.list()
			.stream()
			.collect(Collectors.toSet());
	}

	public long insert(ProductForm p, String imageUrl) {
		KeyHolder keys = new GeneratedKeyHolder();
		jdbc.sql("""
				INSERT INTO Product
				  (name, description, category, manufacturer, style, color, unit_price, pricing_unit, dimensions, coverage_per_box, image_url)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""")
			.params(p.name(), p.description(), p.category(), p.manufacturer(), p.style(), p.color(), p.unitPrice(),
					p.pricingUnit(), p.dimensions(), p.coveragePerBox(), imageUrl)
			.update(keys);
		return keys.getKey().longValue();
	}

	public void update(long id, ProductForm p, String imageUrl) {
		jdbc.sql("""
				UPDATE Product SET
				  name = ?, description = ?, category = ?, manufacturer = ?, style = ?,
				  color = ?, unit_price = ?, pricing_unit = ?, dimensions = ?, coverage_per_box = ?, image_url = ?
				WHERE product_id = ?""")
			.params(p.name(), p.description(), p.category(), p.manufacturer(), p.style(), p.color(), p.unitPrice(),
					p.pricingUnit(), p.dimensions(), p.coveragePerBox(), imageUrl, id)
			.update();
	}

	/**
	 * @throws org.springframework.dao.DataIntegrityViolationException if a quote request uses the
	 * product (requests must be kept, so the foreign key blocks the delete)
	 */
	public void delete(long id) {
		jdbc.sql("DELETE FROM Product WHERE product_id = ?").param(id).update();
	}

	private static Product mapProduct(ResultSet rs, int rowNum) throws SQLException {
		return new Product(rs.getLong("product_id"), rs.getString("name"), rs.getString("description"),
				rs.getString("category"), rs.getString("manufacturer"), rs.getString("style"), rs.getString("color"),
				rs.getBigDecimal("unit_price"), rs.getString("pricing_unit"), rs.getString("dimensions"),
				rs.getBigDecimal("coverage_per_box"), rs.getString("image_url"),
				rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
	}
}
