package com.annajohnson.flooring.web;

import java.util.List;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.annajohnson.flooring.auth.AuthInterceptor;
import com.annajohnson.flooring.client.AdminGreeting;
import com.annajohnson.flooring.client.ClientDetails;
import com.annajohnson.flooring.client.ClientRepository;
import com.annajohnson.flooring.client.ClientRow;
import com.annajohnson.flooring.client.ClientSummary;
import com.annajohnson.flooring.client.PendingSignup;
import com.annajohnson.flooring.request.NewRequestNotice;
import com.annajohnson.flooring.request.RequestDetails;
import com.annajohnson.flooring.request.RequestRepository;
import com.annajohnson.flooring.request.RequestSummary;

/** Admin dashboard API. Every path here needs a logged-in admin (enforced in WebConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

	private static final String CLIENT_NOT_FOUND = "Client not found.";

	private final ClientRepository clients;
	private final RequestRepository requests;

	public AdminController(ClientRepository clients, RequestRepository requests) {
		this.clients = clients;
		this.requests = requests;
	}

	/**
	 * The dashboard numbers. There are no quotes, orders or bills tables yet, so those are 0;
	 * each one becomes a COUNT/SUM query when its table is added.
	 */
	public record Stats(int newRequests, int openQuotes, int activeOrders, int unpaidBills) {
	}

	public record OverviewResponse(String greeting, String firstName, Stats stats, List<PendingSignup> pendingSignups,
			List<NewRequestNotice> newRequests) {
	}

	public record ClientResponse(ClientDetails client, List<RequestSummary> requests) {
	}

	public record StatusResponse(long id, String status) {
	}

	/**
	 * The greeting and first name both come from MySQL: the time of day from the database clock,
	 * the name from the admin's row in Client. Also lists sign-ups waiting for approval and quote
	 * requests waiting for a first quote.
	 */
	@GetMapping("/overview")
	public OverviewResponse overview(@RequestAttribute(AuthInterceptor.CURRENT_CLIENT) ClientRow admin) {
		AdminGreeting greeting = clients.greetingFor(admin.id());
		List<NewRequestNotice> newRequests = requests.findPending();
		return new OverviewResponse(greeting.greeting(), greeting.firstName(), new Stats(newRequests.size(), 0, 0, 0),
				clients.findPendingSignups(), newRequests);
	}

	/** Every client account (admins are left out). */
	@GetMapping("/clients")
	public Map<String, List<ClientSummary>> listClients() {
		return Map.of("clients", clients.findAllClients());
	}

	/** One client's full details, plus their quote requests for the History section. */
	@GetMapping("/clients/{id}")
	public ClientResponse getClient(@PathVariable String id) {
		ClientDetails client = clients.findClientDetails(parseId(id))
			.orElseThrow(() -> ApiException.notFound(CLIENT_NOT_FOUND));
		return new ClientResponse(client, requests.findSummariesByClient(client.id()));
	}

	/** Body: { status: 'active' | 'disabled' }. Used for Approve, Disable and Re-enable. */
	@PatchMapping("/clients/{id}/status")
	public StatusResponse updateStatus(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
		Object status = body == null ? null : body.get("status");
		if (!"active".equals(status) && !"disabled".equals(status)) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Status must be 'active' or 'disabled'.");
		}
		long clientId = parseId(id);
		if (!clients.updateStatus(clientId, (String) status)) {
			throw ApiException.notFound(CLIENT_NOT_FOUND);
		}
		return new StatusResponse(clientId, (String) status);
	}

	/** Used for Delete, and Decline on a pending sign-up. */
	@DeleteMapping("/clients/{id}")
	public ResponseEntity<Void> deleteClient(@PathVariable String id) {
		boolean deleted;
		try {
			deleted = clients.delete(parseId(id));
		}
		catch (DataIntegrityViolationException ex) {
			// Their quote requests must be kept, so the foreign key blocks the delete.
			throw new ApiException(HttpStatus.CONFLICT,
					"This client has quote requests, so they can't be deleted. Disable the account instead.");
		}
		if (!deleted) {
			throw ApiException.notFound(CLIENT_NOT_FOUND);
		}
		return ResponseEntity.noContent().build();
	}

	/** Every quote request with its client, rooms and photos, newest first. */
	@GetMapping("/requests")
	public Map<String, List<RequestDetails>> listRequests() {
		return Map.of("requests", requests.findAllWithClients());
	}

	private static long parseId(String id) {
		return PathIds.parse(id, CLIENT_NOT_FOUND);
	}
}
