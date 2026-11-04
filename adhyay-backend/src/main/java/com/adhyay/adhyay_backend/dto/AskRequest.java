package com.adhyay.adhyay_backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AskRequest(
        @NotBlank(message = "Question cannot be blank")
        String question,
        String userId,
        String userRole,
        String userEmail
) {}
