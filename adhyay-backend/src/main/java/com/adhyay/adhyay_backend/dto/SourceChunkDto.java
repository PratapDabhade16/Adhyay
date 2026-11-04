package com.adhyay.adhyay_backend.dto;

public record SourceChunkDto(
        double startTime,
        double endTime,
        String formattedTime,
        String text
) {}

