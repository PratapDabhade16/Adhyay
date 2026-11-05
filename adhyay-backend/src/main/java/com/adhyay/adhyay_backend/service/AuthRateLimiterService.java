package com.adhyay.adhyay_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Authentication Rate Limiter Service
 * Rate limiting has been completely disabled per configuration
 * to ensure unrestricted, frictionless sign-in and testing for all campus users.
 */
@Service
public class AuthRateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(AuthRateLimiterService.class);

    public void checkLimit(String key, String actionName) {
        // Rate limiting disabled: unrestricted access
    }

    public void checkAuthAction(String ip, String email, String actionName) {
        // Rate limiting disabled: unrestricted access
    }

    public void reset(String key) {
        // No-op
    }
}
