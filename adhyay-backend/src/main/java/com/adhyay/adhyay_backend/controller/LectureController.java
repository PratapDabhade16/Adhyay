package com.adhyay.adhyay_backend.controller;

import com.adhyay.adhyay_backend.model.Lecture;
import com.adhyay.adhyay_backend.service.LectureService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/lectures")
@CrossOrigin(origins = "*")
public class LectureController {

    private final LectureService lectureService;

    public LectureController(LectureService lectureService) {
        this.lectureService = lectureService;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadLecture(

            @RequestParam("video") MultipartFile video,

            @RequestParam("title") String title,

            @RequestParam(value = "description", required = false)
            String description,

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

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(lecture);

        } catch (Exception e) {
            e.printStackTrace();
            String errorMsg = e.getMessage() != null && !e.getMessage().isBlank() ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(errorMsg);
        }
    }

    @GetMapping
    public ResponseEntity<List<Lecture>> getAllLectures() {

        return ResponseEntity.ok(
                lectureService.getAllLectures()
        );
    }

    @GetMapping("/subject/{subject}")
    public ResponseEntity<List<Lecture>> getBySubject(
            @PathVariable String subject) {

        return ResponseEntity.ok(
                lectureService.getLecturesBySubject(subject)
        );
    }

    @GetMapping("/subject/{subject}/unit/{unit}")
    public ResponseEntity<List<Lecture>> getBySubjectAndUnit(
            @PathVariable String subject,
            @PathVariable String unit) {

        return ResponseEntity.ok(
                lectureService.getLecturesBySubjectAndUnit(
                        subject,
                        unit
                )
        );
    }

    @GetMapping("/faculty/{uploadedBy}")
    public ResponseEntity<List<Lecture>> getByFaculty(
            @PathVariable String uploadedBy) {

        return ResponseEntity.ok(
                lectureService.getLecturesByFaculty(uploadedBy)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLecture(
            @PathVariable String id) {

        try {

            lectureService.deleteLecture(id);

            return ResponseEntity.ok(
                    "Lecture deleted successfully"
            );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());
        }
    }
}