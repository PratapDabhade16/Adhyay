package com.adhyay.adhyay_backend.dto;

public record TranscriptStatusResponse(
        String lectureId,
        String status,
        String error,
        Double durationSeconds
) {}

