package com.annajohnson.flooring.setup;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Locale;

import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Sets up the database on macOS, Windows or Linux:
 * <ol>
 * <li>creates the database named in server/.env (DB_NAME) if it doesn't exist</li>
 * <li>creates the tables from src/main/resources/db/schema.sql</li>
 * <li>creates the admin account (or resets its password if it already exists)</li>
 * </ol>
 * Run from server/ with {@code npm run db:setup}. Safe to run as many times as you like;
 * it never deletes existing data. It does not start the web server.
 */
public final class DatabaseSetup {

	private static final String SCHEMA = "/db/schema.sql";

	private DatabaseSetup() {
	}

	public static void main(String[] args) {
		System.out.println("\nSetting up the Anna Flooring database\n");

		if (!Files.exists(Path.of(".env"))) {
			fail("server/.env not found.",
					"Copy server/.env.example to server/.env and fill in your MySQL password, then run this again.");
		}

		Environment env = loadSettings(args);
		String host = env.getProperty("DB_HOST", "localhost");
		String port = env.getProperty("DB_PORT", "3306");
		String user = env.getProperty("DB_USER", "root");
		String password = env.getProperty("DB_PASSWORD", "");
		String dbName = env.getProperty("DB_NAME", "anna_flooring_springboot_db");
		String adminEmail = env.getProperty("ADMIN_EMAIL", "annajohnson@flooring.com").toLowerCase(Locale.ROOT);
		String adminPassword = env.getProperty("ADMIN_PASSWORD", "Anna@12345");

		// The name is put straight into SQL below, so only allow safe characters.
		if (!dbName.matches("\\w+")) {
			fail("DB_NAME \"" + dbName + "\" may only contain letters, numbers and underscores.", null);
		}

		String url = "jdbc:mysql://" + host + ":" + port + "/?allowMultiQueries=true&allowPublicKeyRetrieval=true";
		try (Connection connection = connect(url, user, password, host, port)) {
			try (Statement statement = connection.createStatement()) {
				statement.execute("CREATE DATABASE IF NOT EXISTS `" + dbName + "`");
				statement.execute("USE `" + dbName + "`");
				step("Database \"" + dbName + "\" is ready");

				statement.execute(readSchema());
				step("Tables created (existing tables and data were left alone)");
			}

			String passwordHash = new BCryptPasswordEncoder(10).encode(adminPassword);
			try (PreparedStatement insert = connection.prepareStatement("""
					INSERT INTO Client (first_name, last_name, email, password_hash, role, status)
					VALUES (?, ?, ?, ?, 'admin', 'active') AS new_admin
					ON DUPLICATE KEY UPDATE
					  first_name = new_admin.first_name,
					  last_name = new_admin.last_name,
					  password_hash = new_admin.password_hash,
					  role = 'admin',
					  status = 'active'""")) {
				insert.setString(1, "Anna");
				insert.setString(2, "Johnson");
				insert.setString(3, adminEmail);
				insert.setString(4, passwordHash);
				// 1 for a new row, 2 for an updated one.
				int affected = insert.executeUpdate();
				step(affected == 1 ? "Admin account created" : "Admin account already existed; password reset");
			}
		}
		catch (SQLException | IOException ex) {
			fail("Setup failed: " + ex.getMessage(), null);
		}

		System.out.println("\nDone. Log in as the admin with:");
		System.out.println("    Email:    " + adminEmail);
		System.out.println("    Password: " + adminPassword + "\n");
	}

	/**
	 * Reads server/.env and application.properties the same way the web server does, without
	 * starting it. A bare Spring context: no component scan, no auto-configuration.
	 */
	private static Environment loadSettings(String[] args) {
		System.setProperty("spring.devtools.restart.enabled", "false");
		SpringApplication app = new SpringApplication(DatabaseSetup.class);
		app.setWebApplicationType(WebApplicationType.NONE);
		app.setBannerMode(Banner.Mode.OFF);
		app.setLogStartupInfo(false);
		try (ConfigurableApplicationContext context = app.run(args)) {
			return context.getEnvironment();
		}
	}

	private static Connection connect(String url, String user, String password, String host, String port) {
		try {
			return DriverManager.getConnection(url, user, password);
		}
		catch (SQLException ex) {
			if (ex.getErrorCode() == 1045) {
				fail("MySQL rejected the login for user \"" + user + "\".", "Check DB_USER and DB_PASSWORD in server/.env.");
			}
			if ("08S01".equals(ex.getSQLState())) {
				fail("Could not reach MySQL at " + host + ":" + port + ".",
						"Make sure MySQL is installed and running (macOS: `brew services start mysql`; "
								+ "Windows: start the \"MySQL\" service), and check DB_HOST/DB_PORT in server/.env.");
			}
			fail("Could not connect to MySQL: " + ex.getMessage(), null);
			return null; // unreachable
		}
	}

	private static String readSchema() throws IOException {
		try (InputStream in = DatabaseSetup.class.getResourceAsStream(SCHEMA)) {
			if (in == null) {
				throw new IOException(SCHEMA + " is missing from the classpath.");
			}
			return new String(in.readAllBytes(), StandardCharsets.UTF_8);
		}
	}

	private static void step(String message) {
		System.out.println("  - " + message);
	}

	private static void fail(String message, String hint) {
		System.err.println("\nError: " + message);
		if (hint != null) {
			System.err.println("  " + hint);
		}
		System.exit(1);
	}
}
