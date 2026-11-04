package com.adhyay.adhyay_backend.controller;

import com.adhyay.adhyay_backend.model.Lecture;
import com.adhyay.adhyay_backend.model.LectureDoubt;
import com.adhyay.adhyay_backend.repository.LectureDoubtRepository;
import com.adhyay.adhyay_backend.repository.LectureRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class DoubtController {

    private final LectureDoubtRepository doubtRepository;
    private final LectureRepository lectureRepository;

    public DoubtController(LectureDoubtRepository doubtRepository, LectureRepository lectureRepository) {
        this.doubtRepository = doubtRepository;
        this.lectureRepository = lectureRepository;
    }

    public record PostDoubtRequest(String question, String studentId, String studentName, String studentEmail) {}
    public record ReplyDoubtRequest(String reply, String facultyName, String facultyEmail) {}

    @GetMapping("/lectures/{lectureId}/doubts")
    public ResponseEntity<List<LectureDoubt>> getDoubtsForLecture(@PathVariable String lectureId) {
        List<LectureDoubt> list = doubtRepository.findByLectureIdOrderByCreatedAtDesc(lectureId);
        return ResponseEntity.ok(list);
    }

    @PostMapping("/lectures/{lectureId}/doubts")
    public ResponseEntity<?> postDoubt(
            @PathVariable String lectureId,
            @RequestBody PostDoubtRequest request,
            @RequestHeader(value = "X-User-Name", required = false) String headerName,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail,
            @RequestHeader(value = "X-User-Id", required = false) String headerId) {

        if (request.question() == null || request.question().trim().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Question text cannot be empty"));
        }

        String studentName = request.studentName() != null && !request.studentName().isBlank()
                ? request.studentName() : (headerName != null ? headerName : "Student");
        String studentEmail = request.studentEmail() != null && !request.studentEmail().isBlank()
                ? request.studentEmail() : (headerEmail != null ? headerEmail : "student@walchandsangli.ac.in");
        String studentId = request.studentId() != null && !request.studentId().isBlank()
                ? request.studentId() : headerId;

        String lectureTitle = "Lecture";
        Lecture lecture = lectureRepository.findById(lectureId).orElse(null);
        if (lecture != null && lecture.getTitle() != null) {
            lectureTitle = lecture.getTitle();
        }

        LectureDoubt doubt = new LectureDoubt(
                lectureId,
                lectureTitle,
                studentId,
                studentName,
                studentEmail,
                request.question().trim()
        );

        LectureDoubt saved = doubtRepository.save(doubt);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/doubts")
    public ResponseEntity<List<LectureDoubt>> getAllDoubts(
            @RequestParam(required = false) String lectureId,
            @RequestParam(required = false) String status) {

        if (lectureId != null && !lectureId.isBlank()) {
            return ResponseEntity.ok(doubtRepository.findByLectureIdOrderByCreatedAtDesc(lectureId));
        }
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(doubtRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase()));
        }
        return ResponseEntity.ok(doubtRepository.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping("/doubts/{doubtId}/reply")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<?> replyToDoubt(
            @PathVariable String doubtId,
            @RequestBody ReplyDoubtRequest request,
            @RequestHeader(value = "X-User-Name", required = false) String headerFacultyName,
            @RequestHeader(value = "X-User-Email", required = false) String headerFacultyEmail) {

        if (request.reply() == null || request.reply().trim().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Reply text cannot be empty"));
        }

        LectureDoubt doubt = doubtRepository.findById(doubtId).orElse(null);
        if (doubt == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Doubt not found with id: " + doubtId));
        }

        String facultyIdentifier = request.facultyName() != null && !request.facultyName().isBlank()
                ? request.facultyName()
                : (headerFacultyName != null ? headerFacultyName : (headerFacultyEmail != null ? headerFacultyEmail : "Faculty Instructor"));

        doubt.setFacultyReply(request.reply().trim());
        doubt.setRepliedBy(facultyIdentifier);
        doubt.setRepliedAt(Instant.now());
        doubt.setStatus("RESOLVED");

        LectureDoubt updated = doubtRepository.save(doubt);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/doubts/{doubtId}")
    public ResponseEntity<?> deleteDoubt(@PathVariable String doubtId) {
        if (!doubtRepository.existsById(doubtId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Doubt not found"));
        }
        doubtRepository.deleteById(doubtId);
        return ResponseEntity.ok(Map.of("message", "Doubt deleted successfully"));
    }
}

