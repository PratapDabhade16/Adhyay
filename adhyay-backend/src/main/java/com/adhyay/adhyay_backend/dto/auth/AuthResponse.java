package com.adhyay.adhyay_backend.dto.auth;

import com.adhyay.adhyay_backend.model.User;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInSeconds,
        User user
) {
    public AuthResponse(String accessToken, String refreshToken, long expiresInSeconds, User user) {
        this(accessToken, refreshToken, "Bearer", expiresInSeconds, user);
    }
}

