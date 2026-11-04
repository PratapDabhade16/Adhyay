package com.adhyay.adhyay_backend.controller;

import com.adhyay.adhyay_backend.model.Announcement;
import com.adhyay.adhyay_backend.service.AnnouncementService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/announcements")
@CrossOrigin(origins = "*")
public class AnnouncementController {

    private final AnnouncementService announcementService;

    public AnnouncementController(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

    public record CreateAnnouncementRequest(String title, String content, String subjectName, String branch) {}

    @PostMapping
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public ResponseEntity<?> createAnnouncement(@RequestBody CreateAnnouncementRequest request, Authentication auth) {
        if (request.title() == null || request.title().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Title is required"));
        }
        if (request.content() == null || request.content().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Content is required"));
        }

        String author = auth != null ? auth.getName() : "Faculty";
        String role = auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().contains("ADMIN"))
                ? "ADMIN" : "FACULTY";

        Announcement saved = announcementService.createAnnouncement(
                request.title(),
                request.content(),
                request.subjectName(),
                request.branch(),
                author,
                role
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<List<Announcement>> getAnnouncements(
            @RequestParam(required = false) String subjectName,
            @RequestParam(required = false) String branch) {

        List<Announcement> list = announcementService.getAnnouncements(subjectName, branch);
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable String id) {
        boolean deleted = announcementService.deleteAnnouncement(id);
        if (deleted) {
            return ResponseEntity.ok(Map.of("message", "Announcement deleted successfully"));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Announcement not found"));
        }
    }
}

