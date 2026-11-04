package com.adhyay.adhyay_backend.controller;

import com.adhyay.adhyay_backend.service.AnalyticsService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    /**
     * Faculty Analytics Dashboard data:
     * Lecture drop-off histogram (10% buckets), views, completion rate,
     * average watch percentage, and most asked AI questions.
     */
    @GetMapping("/faculty")
    @PreAuthorize("hasAnyRole('FACULTY', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getFacultyAnalytics(
            @RequestParam(required = false) String lectureId,
            @RequestParam(required = false) String subject,
            Authentication auth) {

        String email = auth != null ? auth.getName() : null;
        Map<String, Object> data = analyticsService.getFacultyAnalytics(email, lectureId, subject);
        return ResponseEntity.ok(data);
    }

    /**
     * Admin Institutional Analytics data:
     * User counts by role, active users, weekly lecture uploads,
     * storage estimates, AI assistant usage & failure rate.
     */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getAdminAnalytics() {
        Map<String, Object> data = analyticsService.getAdminAnalytics();
        return ResponseEntity.ok(data);
    }

    /**
     * Exportable Audit Logs (CSV format) with date, user, and action filters.
     */
    @GetMapping(value = "/admin/audit-logs/export", produces = "text/csv")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> exportAuditLogs(
            @RequestParam(required = false) String userEmail,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        Instant start = null;
        Instant end = null;
        if (startDate != null && !startDate.isBlank()) {
            try { start = Instant.parse(startDate); } catch (Exception ignored) {}
        }
        if (endDate != null && !endDate.isBlank()) {
            try { end = Instant.parse(endDate); } catch (Exception ignored) {}
        }

        String csv = analyticsService.exportAuditLogsCsv(userEmail, action, start, end);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"adhyay_audit_logs.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}

