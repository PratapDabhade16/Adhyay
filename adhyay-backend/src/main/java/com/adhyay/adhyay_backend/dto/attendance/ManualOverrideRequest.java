package com.adhyay.adhyay_backend.dto.attendance;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ManualOverrideRequest(
        @NotBlank(message = "Student email is required")
        @Email(message = "Invalid student email format")
        String studentEmail,
        String studentName,
        @NotBlank(message = "Action must be ADD or REMOVE")
        String action // "ADD" or "REMOVE"
) {}

