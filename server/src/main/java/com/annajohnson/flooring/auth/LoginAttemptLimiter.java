package com.annajohnson.flooring.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.annajohnson.flooring.web.ApiException;

/**
 * Slows down password guessing by counting failed attempts in memory. Within any
 * {@link #WINDOW}, a key (an email, an IP address, or a client changing their password) may fail
 * up to its limit; after that it gets 429 until its oldest failure is older than the window.
 * Counts reset when the server restarts, which is fine for a single server.
 */
@Component
public class LoginAttemptLimiter {

	public static final Duration WINDOW = Duration.ofMinutes(15);
	/** Wrong passwords for one account (or one client's current password) before it's locked for a while. */
	public static final int MAX_PER_ACCOUNT = 5;
	/** Wrong passwords from one IP address, across all accounts. */
	public static final int MAX_PER_IP = 20;

	// Past this many keys, expired ones are cleared out so memory can't grow without bound.
	private static final int CLEANUP_THRESHOLD = 10_000;

	private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
	private final Clock clock = Clock.systemUTC();

	/** Throws 429 if the key has used up its failed attempts. */
	public void check(String key, int max) {
		Deque<Instant> times = failures.get(key);
		if (times == null) {
			return;
		}
		synchronized (times) {
			Instant now = clock.instant();
			prune(times, now);
			if (times.size() >= max) {
				long seconds = Duration.between(now, times.peekFirst().plus(WINDOW)).toSeconds();
				long minutes = Math.max(1, (seconds + 59) / 60);
				throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many failed attempts. Please try again in "
						+ minutes + (minutes == 1 ? " minute." : " minutes."));
			}
		}
	}

	public void recordFailure(String key) {
		if (failures.size() > CLEANUP_THRESHOLD) {
			removeExpired();
		}
		Deque<Instant> times = failures.computeIfAbsent(key, k -> new ArrayDeque<>());
		synchronized (times) {
			times.addLast(clock.instant());
		}
	}

	/** Forgets every failure. Used by tests so one test's failed logins don't lock out the next. */
	public void clear() {
		failures.clear();
	}

	/** Forgets a key's failures, e.g. after a successful login. */
	public void reset(String key) {
		failures.remove(key);
	}

	private void removeExpired() {
		Instant now = clock.instant();
		failures.values().removeIf(times -> {
			synchronized (times) {
				prune(times, now);
				return times.isEmpty();
			}
		});
	}

	private static void prune(Deque<Instant> times, Instant now) {
		Instant cutoff = now.minus(WINDOW);
		while (!times.isEmpty() && times.peekFirst().isBefore(cutoff)) {
			times.removeFirst();
		}
	}
}
