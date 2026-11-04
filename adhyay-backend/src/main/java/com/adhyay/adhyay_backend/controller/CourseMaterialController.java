package com.adhyay.adhyay_backend.controller;

import com.adhyay.adhyay_backend.model.CourseMaterial;
import com.adhyay.adhyay_backend.service.CourseMaterialService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/materials")
@CrossOrigin(origins = "*")
public class CourseMaterialController {

    private final CourseMaterialService courseMaterialService;

    public CourseMaterialController(CourseMaterialService courseMaterialService) {
        this.courseMaterialService = courseMaterialService;
    }

    @PostMapping("/upload")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<?> uploadMaterial(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "subjectName", required = false) String subjectName,
            @RequestParam(value = "lectureId", required = false) String lectureId,
            @RequestParam(value = "isAssignment", defaultValue = "false") boolean isAssignment,
            @RequestParam(value = "deadline", required = false) String deadlineStr,
            Authentication auth) {

        try {
            String facultyEmail = auth != null ? auth.getName() : "faculty@walchandsangli.ac.in";
            Instant deadline = null;
            if (deadlineStr != null && !deadlineStr.isBlank()) {
                try {
                    deadline = Instant.parse(deadlineStr);
                } catch (Exception ignored) {
                    // fallback if yyyy-MM-dd
                }
            }

            CourseMaterial material = courseMaterialService.uploadMaterial(
                    file,
                    title,
                    description,
                    subjectName,
                    lectureId,
                    isAssignment,
                    deadline,
                    facultyEmail,
                    facultyEmail
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(material);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Material upload failed: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<CourseMaterial>> getMaterials(
            @RequestParam(required = false) String subjectName,
            @RequestParam(required = false) String lectureId,
            @RequestParam(required = false) Boolean isAssignment) {

        List<CourseMaterial> list = courseMaterialService.getMaterials(subjectName, lectureId, isAssignment);
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<?> deleteMaterial(@PathVariable String id) {
        boolean deleted = courseMaterialService.deleteMaterial(id);
        if (deleted) {
            return ResponseEntity.ok(Map.of("message", "Material deleted successfully"));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Material not found"));
        }
    }
}

