package com.adhyay.adhyay_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class AuthRateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(AuthRateLimiterService.class);

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_SECONDS = 15 * 60; // 15 minutes

    private static class RateTracker {
        final AtomicInteger count = new AtomicInteger(0);
        volatile long resetEpochMs;

        RateTracker(long windowSeconds) {
            this.resetEpochMs = Instant.now().plusSeconds(windowSeconds).toEpochMilli();
        }

        boolean isExpired() {
            return System.currentTimeMillis() > resetEpochMs;
        }

        void reset(long windowSeconds) {
            count.set(0);
            resetEpochMs = Instant.now().plusSeconds(windowSeconds).toEpochMilli();
        }

        long getRemainingSeconds() {
            long diff = (resetEpochMs - System.currentTimeMillis()) / 1000;
            return Math.max(diff, 1);
        }
    }

    private final Map<String, RateTracker> rateLimitMap = new ConcurrentHashMap<>();

    public void checkLimit(String key, String actionName) {
        if (key == null || key.isBlank()) return;

        RateTracker tracker = rateLimitMap.compute(key, (k, existing) -> {
            if (existing == null || existing.isExpired()) {
                RateTracker fresh = new RateTracker(WINDOW_SECONDS);
                fresh.count.incrementAndGet();
                return fresh;
            } else {
                existing.count.incrementAndGet();
                return existing;
            }
        });

        if (tracker.count.get() > MAX_ATTEMPTS) {
            long waitMinutes = Math.max(1, (tracker.getRemainingSeconds() + 59) / 60);
            String message = String.format("Too many %s attempts. Rate limit exceeded (max %d attempts per 15 minutes). Please try again in %d minute(s).",
                    actionName, MAX_ATTEMPTS, waitMinutes);
            log.warn("Rate limit exceeded for key [{}], action [{}]: count={}", key, actionName, tracker.count.get());
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, message);
        }
    }

    public void checkAuthAction(String ip, String email, String actionName) {
        if (ip != null && !ip.isBlank()) {
            checkLimit("ip:" + ip.trim(), actionName);
        }
        if (email != null && !email.isBlank()) {
            checkLimit("email:" + email.trim().toLowerCase(), actionName);
        }
    }

    public void reset(String key) {
        if (key != null) {
            rateLimitMap.remove(key);
        }
    }
}

