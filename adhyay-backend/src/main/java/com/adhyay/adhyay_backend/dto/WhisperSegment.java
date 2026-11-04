package com.adhyay.adhyay_backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WhisperSegment(
        double start,
        double end,
        String text
) {}

