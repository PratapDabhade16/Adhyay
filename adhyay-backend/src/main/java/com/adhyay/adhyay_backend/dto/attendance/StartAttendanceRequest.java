package com.adhyay.adhyay_backend.dto.attendance;

import jakarta.validation.constraints.NotBlank;

public record StartAttendanceRequest(
        @NotBlank(message = "Subject ID is required")
        String subjectId,
        String subjectName,
        String branch
) {}

