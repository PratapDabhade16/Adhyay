package com.adhyay.adhyay_backend.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {

    private static final int MAX_REQUESTS_PER_HOUR = 20;
    private static final long ONE_HOUR_MILLIS = 3600_000L;

    private final Map<String, Deque<Long>> userRequestTimestamps = new ConcurrentHashMap<>();

    /**
     * Checks if a user is within the rate limit (20 questions per hour).
     * @param userKey Unique identifier (e.g. userId, email, or IP)
     * @return true if permitted, false if rate limit exceeded
     */
    public synchronized boolean allowRequest(String userKey) {
        if (userKey == null || userKey.isBlank()) {
            userKey = "anonymous";
        }

        long now = Instant.now().toEpochMilli();
        long windowStart = now - ONE_HOUR_MILLIS;

        Deque<Long> timestamps = userRequestTimestamps.computeIfAbsent(userKey, k -> new ArrayDeque<>());

        // Evict timestamps older than 1 hour
        while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= MAX_REQUESTS_PER_HOUR) {
            return false;
        }

        timestamps.addLast(now);
        return true;
    }

    public int getRemainingRequests(String userKey) {
        if (userKey == null || userKey.isBlank()) return 0;
        long now = Instant.now().toEpochMilli();
        long windowStart = now - ONE_HOUR_MILLIS;

        Deque<Long> timestamps = userRequestTimestamps.get(userKey);
        if (timestamps == null) return MAX_REQUESTS_PER_HOUR;

        synchronized (this) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }
            return Math.max(0, MAX_REQUESTS_PER_HOUR - timestamps.size());
        }
    }
}

