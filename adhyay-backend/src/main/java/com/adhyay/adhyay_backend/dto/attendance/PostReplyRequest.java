package com.adhyay.adhyay_backend.dto.attendance;

import jakarta.validation.constraints.NotBlank;

public record PostReplyRequest(
        @NotBlank(message = "Reply text cannot be blank")
        String text
) {}

