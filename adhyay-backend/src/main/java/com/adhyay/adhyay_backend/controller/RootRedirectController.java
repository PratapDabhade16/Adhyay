package com.adhyay.adhyay_backend.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.net.URI;
import java.util.Map;

@Controller
public class RootRedirectController {

    private static final String FRONTEND_LANDING_URL = "http://localhost:3000/";

    @GetMapping("/")
    public ResponseEntity<?> handleRoot(@RequestHeader(value = HttpHeaders.ACCEPT, required = false) String acceptHeader) {
        // If an API tool or client explicitly asks for JSON, respond with helpful service status
        if (acceptHeader != null && acceptHeader.contains("application/json")) {
            return ResponseEntity.ok(Map.of(
                    "service", "ADHYAY Backend API",
                    "status", "UP",
                    "frontendLandingPage", FRONTEND_LANDING_URL,
                    "healthEndpoint", "http://localhost:8081/api/health"
            ));
        }

        // For browser visits, seamlessly redirect to the frontend landing page
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(FRONTEND_LANDING_URL))
                .build();
    }
}

