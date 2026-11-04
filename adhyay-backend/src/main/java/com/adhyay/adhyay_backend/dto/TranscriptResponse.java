package com.adhyay.adhyay_backend.dto;

import java.util.List;

public record TranscriptResponse(
        String lectureId,
        String status,
        String transcript,
        List<SourceChunkDto> chunks
) {}

