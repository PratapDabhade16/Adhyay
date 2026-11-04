package com.adhyay.adhyay_backend.dto;

import java.util.List;

public record AskResponse(
        String answer,
        List<SourceChunkDto> sources
) {}

