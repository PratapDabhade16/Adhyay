package com.adhyay.adhyay_backend.service;

import org.springframework.stereotype.Service;

/**
 * Question/AI Rate Limiter Service
 * Rate limiting has been completely disabled to provide unrestricted campus learning.
 */
@Service
public class RateLimiterService {

    public synchronized boolean allowRequest(String userKey) {
        return true;
    }

    public int getRemainingRequests(String userKey) {
        return 9999;
    }
}
