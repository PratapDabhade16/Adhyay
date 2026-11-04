package com.adhyay.adhyay_backend.dto.attendance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MarkAttendanceRequest(
        @NotBlank(message = "Attendance code is required")
        @Pattern(regexp = "^\\d{6}$", message = "Attendance code must be exactly 6 digits")
        String code
) {}

