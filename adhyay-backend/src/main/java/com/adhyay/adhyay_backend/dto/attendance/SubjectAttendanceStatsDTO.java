package com.adhyay.adhyay_backend.dto.attendance;

public record SubjectAttendanceStatsDTO(
        String subjectId,
        String subjectName,
        long attendedSessions,
        long totalSessions,
        double percentage,
        boolean warningBelow75
) {}

