package com.adhyay.adhyay_backend.controller;

import com.adhyay.adhyay_backend.model.WatchProgress;
import com.adhyay.adhyay_backend.service.WatchProgressService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/progress")
@CrossOrigin(origins = "*")
public class WatchProgressController {

    private final WatchProgressService watchProgressService;

    public WatchProgressController(WatchProgressService watchProgressService) {
        this.watchProgressService = watchProgressService;
    }

    public record SaveProgressRequest(String lectureId, double positionSeconds, double durationSeconds) {}

    @PostMapping
    public ResponseEntity<?> saveProgress(@RequestBody SaveProgressRequest request, Authentication auth) {
        String studentEmail = auth != null ? auth.getName() : null;
        if (studentEmail == null || studentEmail.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "User not authenticated"));
        }

        WatchProgress saved = watchProgressService.saveProgress(
                null,
                studentEmail,
                request.lectureId(),
                request.positionSeconds(),
                request.durationSeconds()
        );

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{lectureId}")
    public ResponseEntity<?> getProgress(@PathVariable String lectureId, Authentication auth) {
        String studentEmail = auth != null ? auth.getName() : null;
        if (studentEmail == null || studentEmail.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "User not authenticated"));
        }

        return watchProgressService.getProgress(null, studentEmail, lectureId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(new WatchProgress()));
    }

    @GetMapping("/continue-watching")
    public ResponseEntity<List<WatchProgress>> getContinueWatching(Authentication auth) {
        String studentEmail = auth != null ? auth.getName() : null;
        if (studentEmail == null || studentEmail.isBlank()) {
            return ResponseEntity.status(401).build();
        }

        List<WatchProgress> list = watchProgressService.getContinueWatching(null, studentEmail);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/history")
    public ResponseEntity<List<WatchProgress>> getWatchHistory(Authentication auth) {
        String studentEmail = auth != null ? auth.getName() : null;
        if (studentEmail == null || studentEmail.isBlank()) {
            return ResponseEntity.status(401).build();
        }

        List<WatchProgress> list = watchProgressService.getWatchHistory(null, studentEmail);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/subject-stats")
    public ResponseEntity<Map<String, Object>> getSubjectStats(Authentication auth) {
        String studentEmail = auth != null ? auth.getName() : null;
        if (studentEmail == null || studentEmail.isBlank()) {
            return ResponseEntity.status(401).build();
        }

        Map<String, Object> stats = watchProgressService.getSubjectCompletionStats(null, studentEmail);
        return ResponseEntity.ok(stats);
    }
}

