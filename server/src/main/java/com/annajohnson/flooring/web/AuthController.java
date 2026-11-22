package com.annajohnson.flooring.web;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.annajohnson.flooring.auth.AuthCookies;
import com.annajohnson.flooring.auth.AuthInterceptor;
import com.annajohnson.flooring.auth.JwtService;
import com.annajohnson.flooring.auth.LoginAttemptLimiter;
import com.annajohnson.flooring.auth.PasswordRules;
import com.annajohnson.flooring.client.ClientRepository;
import com.annajohnson.flooring.client.ClientRow;
import com.annajohnson.flooring.client.LoginRow;
import com.annajohnson.flooring.client.NewClient;
import com.annajohnson.flooring.client.PublicClient;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
	// 7 to 20 characters: digits, spaces, and + ( ) - . e.g. (555) 123-4567
	private static final Pattern PHONE_PATTERN = Pattern.compile("^[0-9+()\\-. ]{7,20}$");
	// 3 to 10 letters, digits, spaces or dashes, so non-US postal codes work too, e.g. 48201 or 48201-1234
	private static final Pattern ZIP_PATTERN = Pattern.compile("^[A-Za-z0-9\\- ]{3,10}$");

	private final ClientRepository clients;
	private final BCryptPasswordEncoder passwords;
	private final JwtService jwt;
	private final AuthCookies authCookies;
	private final LoginAttemptLimiter limiter;
	// Compared against when no account matches, so "wrong email" and "wrong password"
	// take the same time and can't be told apart.
	private final String dummyHash;

	public AuthController(ClientRepository clients, BCryptPasswordEncoder passwords, JwtService jwt,
			AuthCookies authCookies, LoginAttemptLimiter limiter) {
		this.clients = clients;
		this.passwords = passwords;
		this.jwt = jwt;
		this.authCookies = authCookies;
		this.limiter = limiter;
		this.dummyHash = passwords.encode("not-a-real-password");
	}

	/**
	 * Body: { firstName, lastName, email, address, city, state, zipCode, country, phone, password }.
	 * New accounts always get the default 'client' role and 'pending' status; admins are created
	 * only by setup/DatabaseSetup.java.
	 */
	@PostMapping("/register")
	public ResponseEntity<Map<String, PublicClient>> register(@RequestBody(required = false) Map<String, Object> body) {
		String firstName = readString(body, "firstName").strip();
		String lastName = readString(body, "lastName").strip();
		String email = readString(body, "email").strip().toLowerCase(Locale.ROOT);
		String address = readString(body, "address").strip();
		String city = readString(body, "city").strip();
		String state = readString(body, "state").strip();
		String zipCode = readString(body, "zipCode").strip();
		String country = readString(body, "country").strip();
		String phone = readString(body, "phone").strip();
		String password = readString(body, "password");

		Map<String, String> errors = new LinkedHashMap<>();
		requireText(errors, "firstName", "First name", firstName, 50);
		requireText(errors, "lastName", "Last name", lastName, 50);
		if (!EMAIL_PATTERN.matcher(email).matches()) errors.put("email", "Enter a valid email address.");
		else if (email.length() > 255) errors.put("email", "Email must be 255 characters or fewer.");
		requireText(errors, "address", "Street address", address, 255);
		requireText(errors, "city", "City", city, 100);
		requireText(errors, "state", "State", state, 100);
		if (!ZIP_PATTERN.matcher(zipCode).matches()) errors.put("zipCode", "Enter a valid ZIP code.");
		requireText(errors, "country", "Country", country, 100);
		if (!PHONE_PATTERN.matcher(phone).matches()) errors.put("phone", "Enter a valid phone number.");
		String passwordProblem = PasswordRules.problemWith(password);
		if (passwordProblem != null) errors.put("password", passwordProblem);

		if (!errors.isEmpty()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Please fix the highlighted fields.", errors);
		}

		long id;
		try {
			id = clients.insert(new NewClient(firstName, lastName, email, address, city, state, zipCode, country,
					phone, passwords.encode(password)));
		}
		catch (DuplicateKeyException ex) {
			String message = "An account with this email already exists.";
			throw new ApiException(HttpStatus.CONFLICT, message, Map.of("email", message));
		}

		PublicClient created = new PublicClient(id, firstName, lastName, email, "client", address, city, state, zipCode);
		return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("client", created));
	}

	/**
	 * Body: { email, password }. On success sets the httpOnly login cookie and returns the client.
	 * After too many wrong passwords for one email or from one IP address, answers 429 for a while
	 * (see LoginAttemptLimiter).
	 */
	@PostMapping("/login")
	public ResponseEntity<Map<String, PublicClient>> login(@RequestBody(required = false) Map<String, Object> body,
			HttpServletRequest request) {
		String email = readString(body, "email").strip().toLowerCase(Locale.ROOT);
		String password = readString(body, "password");

		Map<String, String> errors = new LinkedHashMap<>();
		if (email.isEmpty()) errors.put("email", "Email is required.");
		if (password.isEmpty()) errors.put("password", "Password is required.");
		if (!errors.isEmpty()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Please fill in your email and password.", errors);
		}

		// The client's IP as Tomcat sees it. Behind a proxy this needs server.forward-headers-strategy.
		String ipKey = "ip:" + request.getRemoteAddr();
		String emailKey = "email:" + email;
		limiter.check(ipKey, LoginAttemptLimiter.MAX_PER_IP);
		limiter.check(emailKey, LoginAttemptLimiter.MAX_PER_ACCOUNT);

		Optional<LoginRow> row = clients.findLoginByEmail(email);
		String hash = row.map(LoginRow::passwordHash).orElse(dummyHash);
		// Always run one bcrypt comparison so response time doesn't reveal whether the email exists.
		boolean passwordOk;
		if (!PasswordRules.tooLong(password)) {
			passwordOk = passwords.matches(password, hash);
		}
		else {
			// Too long to be anyone's password (registration forbids it); still spend the bcrypt time.
			passwords.matches("not-a-real-password", hash);
			passwordOk = false;
		}
		if (row.isEmpty() || !passwordOk) {
			limiter.recordFailure(ipKey);
			limiter.recordFailure(emailKey);
			// Same message either way so the form doesn't reveal which emails have accounts.
			throw new ApiException(HttpStatus.UNAUTHORIZED, "Incorrect email or password.");
		}

		limiter.reset(emailKey);

		// Only checked after the password is right, so this doesn't reveal anything to strangers.
		ClientRow client = row.get().client();
		if ("pending".equals(client.status())) {
			throw new ApiException(HttpStatus.FORBIDDEN, "Your account is waiting for approval. Please try again later.");
		}
		if ("disabled".equals(client.status())) {
			throw new ApiException(HttpStatus.FORBIDDEN, "Your account has been disabled. Please contact us.");
		}

		return ResponseEntity.ok()
			.header(HttpHeaders.SET_COOKIE, authCookies.login(jwt.sign(client)).toString())
			.body(Map.of("client", PublicClient.from(client)));
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout() {
		return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, authCookies.logout().toString()).build();
	}

	/** The logged-in client, or 401 (from AuthInterceptor). */
	@GetMapping("/me")
	public Map<String, PublicClient> me(@RequestAttribute(AuthInterceptor.CURRENT_CLIENT) ClientRow client) {
		return Map.of("client", PublicClient.from(client));
	}

	/** Non-string values (numbers, null, missing) are treated as empty. */
	private static String readString(Map<String, Object> body, String key) {
		return body != null && body.get(key) instanceof String s ? s : "";
	}

	private static void requireText(Map<String, String> errors, String field, String label, String value, int max) {
		if (value.isEmpty()) errors.put(field, label + " is required.");
		else if (value.length() > max) errors.put(field, label + " must be " + max + " characters or fewer.");
	}
}
