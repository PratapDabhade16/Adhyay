package com.adhyay.adhyay_backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WhisperResponse(
        String text,
        Double duration,
        List<WhisperSegment> segments
) {}

