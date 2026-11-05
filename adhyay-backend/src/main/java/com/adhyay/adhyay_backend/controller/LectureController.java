package com.adhyay.adhyay_backend.controller;

import com.adhyay.adhyay_backend.dto.AskRequest;
import com.adhyay.adhyay_backend.dto.AskResponse;
import com.adhyay.adhyay_backend.dto.TranscriptResponse;
import com.adhyay.adhyay_backend.dto.TranscriptStatusResponse;
import com.adhyay.adhyay_backend.model.Lecture;
import com.adhyay.adhyay_backend.service.LectureAiService;
import com.adhyay.adhyay_backend.service.LectureService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/lectures")
@CrossOrigin(origins = "*")
public class LectureController {

    private final LectureService lectureService;
    private final LectureAiService lectureAiService;
    private final com.adhyay.adhyay_backend.service.NotificationService notificationService;

    public LectureController(LectureService lectureService,
                             LectureAiService lectureAiService,
                             com.adhyay.adhyay_backend.service.NotificationService notificationService) {
        this.lectureService = lectureService;
        this.lectureAiService = lectureAiService;
        this.notificationService = notificationService;
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('FACULTY', 'ADMIN')")
    public ResponseEntity<?> uploadLecture(
            @RequestParam("video") MultipartFile video,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("subject") String subject,
            @RequestParam("unit") String unit,
            @RequestParam("lectureNumber") int lectureNumber,
            @RequestParam("uploadedBy") String uploadedBy) {

        try {
            Lecture lecture = lectureService.uploadLecture(
                    video,
                    title,
                    description,
                    subject,
                    unit,
                    lectureNumber,
                    uploadedBy
            );

            try {
                notificationService.broadcastToStudents(
                        "NEW_LECTURE",
                        "🎥 New Lecture: " + lecture.getTitle(),
                        "New lecture available for " + lecture.getSubject() + " (Unit " + lecture.getUnit() + ")",
                        "student-dashboard.html",
                        false
                );
            } catch (Exception ex) {
                System.err.println("Notification dispatch error: " + ex.getMessage());
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(lecture);

        } catch (Exception e) {
            e.printStackTrace();
            String errorMsg = e.getMessage() != null && !e.getMessage().isBlank() ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorMsg);
        }
    }

    @GetMapping
    public ResponseEntity<List<Lecture>> getAllLectures() {
        return ResponseEntity.ok(lectureService.getAllLectures());
    }

    @GetMapping("/subject/{subject}")
    public ResponseEntity<List<Lecture>> getBySubject(@PathVariable String subject) {
        return ResponseEntity.ok(lectureService.getLecturesBySubject(subject));
    }

    @GetMapping("/subject/{subject}/unit/{unit}")
    public ResponseEntity<List<Lecture>> getBySubjectAndUnit(
            @PathVariable String subject,
            @PathVariable String unit) {
        return ResponseEntity.ok(lectureService.getLecturesBySubjectAndUnit(subject, unit));
    }

    @GetMapping("/faculty/{uploadedBy}")
    public ResponseEntity<List<Lecture>> getByFaculty(@PathVariable String uploadedBy) {
        return ResponseEntity.ok(lectureService.getLecturesByFaculty(uploadedBy));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLecture(@PathVariable String id) {
        try {
            lectureService.deleteLecture(id);
            return ResponseEntity.ok("Lecture deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<?> recordView(@PathVariable String id) {
        Lecture lecture = lectureService.incrementViews(id);
        if (lecture != null) {
            return ResponseEntity.ok(lecture);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Lecture not found");
    }

    // ==========================================
    // AI LECTURE ASSISTANT ENDPOINTS
    // ==========================================

    @PostMapping("/{id}/ask")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'ADMIN')")
    public ResponseEntity<?> askLectureQuestion(
            @PathVariable String id,
            @Valid @RequestBody AskRequest request,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Email", required = false) String userEmailHeader,
            HttpServletRequest httpRequest) {

        // Validate role: only authenticated STUDENT, FACULTY, or ADMIN can use AI Assistant
        String role = roleHeader != null && !roleHeader.isBlank() ? roleHeader : request.userRole();
        if (role == null || (!role.equalsIgnoreCase("STUDENT") && !role.equalsIgnoreCase("FACULTY") && !role.equalsIgnoreCase("ADMIN"))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authentication required. Only registered STUDENT, FACULTY, or ADMIN accounts can ask questions."));
        }

        String userId = userIdHeader != null && !userIdHeader.isBlank() ? userIdHeader : request.userId();
        String userEmail = userEmailHeader != null && !userEmailHeader.isBlank() ? userEmailHeader : request.userEmail();
        String clientIp = httpRequest.getRemoteAddr();

        AskRequest effectiveRequest = new AskRequest(request.question(), userId, role, userEmail);

        try {
            AskResponse response = lectureAiService.askQuestion(id, effectiveRequest, clientIp);
            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            // Rate limit exceeded
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", e.getMessage()));

        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "AI Assistant error: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/transcript-status")
    public ResponseEntity<TranscriptStatusResponse> getTranscriptStatus(@PathVariable String id) {
        try {
            return ResponseEntity.ok(lectureAiService.getTranscriptStatus(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/{id}/transcript")
    public ResponseEntity<TranscriptResponse> getTranscript(@PathVariable String id) {
        try {
            return ResponseEntity.ok(lectureAiService.getFullTranscript(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/{id}/retry-transcript")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<?> retryTranscript(@PathVariable String id) {
        try {
            lectureAiService.retryTranscription(id);
            return ResponseEntity.ok(Map.of("message", "Transcription re-triggered successfully for lecture " + id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }
}
