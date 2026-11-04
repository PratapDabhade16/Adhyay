package com.adhyay.adhyay_backend.controller;

import com.adhyay.adhyay_backend.model.AcademicSubject;
import com.adhyay.adhyay_backend.model.ActivityLog;
import com.adhyay.adhyay_backend.model.Lecture;
import com.adhyay.adhyay_backend.model.User;
import com.adhyay.adhyay_backend.repository.AcademicSubjectRepository;
import com.adhyay.adhyay_backend.repository.ActivityLogRepository;
import com.adhyay.adhyay_backend.repository.LectureRepository;
import com.adhyay.adhyay_backend.repository.UserRepository;
import com.adhyay.adhyay_backend.service.LectureService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@CrossOrigin(origins = "*")
public class AdminController {

    private final UserRepository userRepository;
    private final LectureRepository lectureRepository;
    private final LectureService lectureService;
    private final AcademicSubjectRepository subjectRepository;
    private final ActivityLogRepository logRepository;

    public AdminController(
            UserRepository userRepository,
            LectureRepository lectureRepository,
            LectureService lectureService,
            AcademicSubjectRepository subjectRepository,
            ActivityLogRepository logRepository) {
        this.userRepository = userRepository;
        this.lectureRepository = lectureRepository;
        this.lectureService = lectureService;
        this.subjectRepository = subjectRepository;
        this.logRepository = logRepository;
    }

    // ==========================================
    // 1. USER MANAGEMENT (Search, Filters, All Details)
    // ==========================================
    public record UserDetail(
            String id,
            String name,
            String email,
            String role,
            String department,
            String rollNumber,
            String status,
            Instant createdAt
    ) {}

    @GetMapping("/users")
    public List<UserDetail> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {

        List<User> users = userRepository.findAll();

        return users.stream()
                .filter(u -> role == null || role.isBlank() || role.equalsIgnoreCase("ALL")
                        || (u.getRole() != null && u.getRole().equalsIgnoreCase(role)))
                .filter(u -> status == null || status.isBlank() || status.equalsIgnoreCase("ALL")
                        || (u.getStatus() != null && u.getStatus().equalsIgnoreCase(status)))
                .filter(u -> {
                    if (search == null || search.isBlank()) return true;
                    String q = search.toLowerCase();
                    boolean matchName = u.getName() != null && u.getName().toLowerCase().contains(q);
                    boolean matchEmail = u.getEmail() != null && u.getEmail().toLowerCase().contains(q);
                    boolean matchDept = u.getDepartment() != null && u.getDepartment().toLowerCase().contains(q);
                    boolean matchRoll = u.getRollNumber() != null && u.getRollNumber().toLowerCase().contains(q);
                    return matchName || matchEmail || matchDept || matchRoll;
                })
                .map(u -> new UserDetail(
                        u.getId(),
                        u.getName() != null ? u.getName() : "Unnamed",
                        u.getEmail(),
                        u.getRole() != null ? u.getRole().toUpperCase() : "STUDENT",
                        u.getDepartment() != null ? u.getDepartment() : "General",
                        u.getRollNumber(),
                        u.getStatus() != null ? u.getStatus() : "ACTIVE",
                        u.getCreatedAt()
                ))
                .sorted((a, b) -> {
                    if (a.createdAt() == null) return 1;
                    if (b.createdAt() == null) return -1;
                    return b.createdAt().compareTo(a.createdAt());
                })
                .toList();
    }

    // ==========================================
    // 2. ACTIVATE / DEACTIVATE ACCOUNTS
    // ==========================================
    @PatchMapping("/users/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(
            @PathVariable String id,
            @RequestParam(defaultValue = "Admin") String adminName) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }

        String currentStatus = user.getStatus() != null ? user.getStatus() : "ACTIVE";
        String nextStatus = "ACTIVE".equalsIgnoreCase(currentStatus) ? "DEACTIVATED" : "ACTIVE";
        user.setStatus(nextStatus);
        userRepository.save(user);

        // Security activity log
        logRepository.save(new ActivityLog(
                "ACTIVE".equals(nextStatus) ? "ACCOUNT_ACTIVATED" : "ACCOUNT_DEACTIVATED",
                adminName,
                user.getEmail(),
                "Account status set to " + nextStatus + " for " + user.getName()
        ));

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "User account is now " + nextStatus.toLowerCase(),
                "newStatus", nextStatus
        ));
    }

    // ==========================================
    // 3. REMOVE UNAUTHORIZED USERS
    // ==========================================
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable String id,
            @RequestParam(defaultValue = "Admin") String adminName) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }

        String userEmail = user.getEmail();
        String userName = user.getName();
        userRepository.deleteById(id);

        // Security activity log
        logRepository.save(new ActivityLog(
                "ACCOUNT_DELETED",
                adminName,
                userEmail,
                "Unauthorized user removed: " + userName + " (" + userEmail + ")"
        ));

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "User " + userEmail + " permanently removed"
        ));
    }

    // ==========================================
    // 4. REGISTRATION APPROVAL
    // ==========================================
    @PostMapping("/users/{id}/approve")
    public ResponseEntity<?> approveRegistration(
            @PathVariable String id,
            @RequestParam(defaultValue = "Admin") String adminName) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }

        user.setStatus("ACTIVE");
        userRepository.save(user);

        logRepository.save(new ActivityLog(
                "REGISTRATION_APPROVED",
                adminName,
                user.getEmail(),
                "Approved institutional registration for " + user.getName() + " (" + user.getRole() + ")"
        ));

        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "User registration approved"));
    }

    @PostMapping("/users/{id}/reject")
    public ResponseEntity<?> rejectRegistration(
            @PathVariable String id,
            @RequestParam(defaultValue = "Admin") String adminName) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }

        user.setStatus("REJECTED");
        userRepository.save(user);

        logRepository.save(new ActivityLog(
                "REGISTRATION_REJECTED",
                adminName,
                user.getEmail(),
                "Rejected institutional registration for " + user.getName()
        ));

        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "User registration rejected"));
    }

    // ==========================================
    // 5. ACADEMIC MANAGEMENT (Subjects, Semesters, Faculty Assignments)
    // ==========================================
    @GetMapping("/academic/subjects")
    public List<AcademicSubject> getAllSubjects() {
        List<AcademicSubject> list = subjectRepository.findAll();
        // Seed default subjects if empty
        if (list.isEmpty()) {
            List<AcademicSubject> defaults = List.of(
                    new AcademicSubject("Data Structures & Algorithms", "CS301", "Semester 3", "Computer Science", "patil@walchandsangli.ac.in", "Prof. Patil"),
                    new AcademicSubject("Database Management Systems", "CS302", "Semester 3", "Computer Science", "kulkarni@walchandsangli.ac.in", "Prof. Kulkarni"),
                    new AcademicSubject("Operating Systems", "CS401", "Semester 4", "Computer Science", "deshmukh@walchandsangli.ac.in", "Prof. Deshmukh"),
                    new AcademicSubject("Computer Networks", "CS501", "Semester 5", "Information Technology", "shinde@walchandsangli.ac.in", "Prof. Shinde")
            );
            return subjectRepository.saveAll(defaults);
        }
        return list;
    }

    @PostMapping("/academic/subjects")
    public ResponseEntity<?> createSubject(
            @RequestBody AcademicSubject subject,
            @RequestParam(defaultValue = "Admin") String adminName) {
        if (subject.getName() == null || subject.getName().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Subject name is required"));
        }
        AcademicSubject saved = subjectRepository.save(subject);

        logRepository.save(new ActivityLog(
                "SUBJECT_CREATED",
                adminName,
                saved.getName(),
                "Created subject " + saved.getName() + " (" + saved.getCode() + ") assigned to " + saved.getAssignedFacultyName()
        ));

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/academic/subjects/{id}")
    public ResponseEntity<?> updateSubject(
            @PathVariable String id,
            @RequestBody AcademicSubject updated,
            @RequestParam(defaultValue = "Admin") String adminName) {
        AcademicSubject subject = subjectRepository.findById(id).orElse(null);
        if (subject == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Subject not found"));
        }

        if (updated.getName() != null) subject.setName(updated.getName());
        if (updated.getCode() != null) subject.setCode(updated.getCode());
        if (updated.getSemester() != null) subject.setSemester(updated.getSemester());
        if (updated.getDepartment() != null) subject.setDepartment(updated.getDepartment());
        if (updated.getAssignedFacultyEmail() != null) subject.setAssignedFacultyEmail(updated.getAssignedFacultyEmail());
        if (updated.getAssignedFacultyName() != null) subject.setAssignedFacultyName(updated.getAssignedFacultyName());

        AcademicSubject saved = subjectRepository.save(subject);

        logRepository.save(new ActivityLog(
                "SUBJECT_UPDATED",
                adminName,
                saved.getName(),
                "Updated curriculum details for " + saved.getName()
        ));

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/academic/subjects/{id}")
    public ResponseEntity<?> deleteSubject(
            @PathVariable String id,
            @RequestParam(defaultValue = "Admin") String adminName) {
        AcademicSubject subject = subjectRepository.findById(id).orElse(null);
        if (subject == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Subject not found"));
        }

        subjectRepository.deleteById(id);

        logRepository.save(new ActivityLog(
                "SUBJECT_DELETED",
                adminName,
                subject.getName(),
                "Deleted subject " + subject.getName() + " (" + subject.getCode() + ")"
        ));

        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Subject removed"));
    }

    // ==========================================
    // 6. LECTURE MANAGEMENT (View, Approve, Reject, Edit, Delete)
    // ==========================================
    @GetMapping("/lectures")
    public List<Lecture> getAllLecturesAdmin() {
        return lectureRepository.findAll().stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .toList();
    }

    @PatchMapping("/lectures/{id}/status")
    public ResponseEntity<?> updateLectureStatus(
            @PathVariable String id,
            @RequestParam String status,
            @RequestParam(defaultValue = "Admin") String adminName) {
        Lecture lecture = lectureRepository.findById(id).orElse(null);
        if (lecture == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Lecture not found"));
        }

        String newStatus = status.toUpperCase();
        lecture.setStatus(newStatus);
        lectureRepository.save(lecture);

        logRepository.save(new ActivityLog(
                "APPROVED".equals(newStatus) ? "LECTURE_APPROVED" : "LECTURE_REJECTED",
                adminName,
                lecture.getTitle(),
                "Lecture " + lecture.getTitle() + " status set to " + newStatus
        ));

        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Lecture is now " + newStatus));
    }

    public record LectureEditRequest(
            String title,
            String subject,
            String unit,
            int lectureNumber,
            String status
    ) {}

    @PutMapping("/lectures/{id}")
    public ResponseEntity<?> editLecture(
            @PathVariable String id,
            @RequestBody LectureEditRequest req,
            @RequestParam(defaultValue = "Admin") String adminName) {
        try {
            Lecture updated = lectureService.updateLecture(
                    id, req.title(), req.subject(), req.unit(), req.lectureNumber(), req.status()
            );

            logRepository.save(new ActivityLog(
                    "LECTURE_EDITED",
                    adminName,
                    updated.getTitle(),
                    "Admin modified lecture metadata: " + updated.getTitle()
            ));

            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/lectures/{id}")
    public ResponseEntity<?> deleteLectureAdmin(
            @PathVariable String id,
            @RequestParam(defaultValue = "Admin") String adminName) {
        try {
            Lecture lecture = lectureRepository.findById(id).orElse(null);
            String title = lecture != null ? lecture.getTitle() : id;

            lectureService.deleteLecture(id);

            logRepository.save(new ActivityLog(
                    "LECTURE_DELETED",
                    adminName,
                    title,
                    "Lecture removed from platform and Cloudinary: " + title
            ));

            return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Lecture deleted successfully"));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", e.getMessage()));
        }
    }

    // ==========================================
    // 7. DASHBOARD ANALYTICS
    // ==========================================
    @GetMapping("/analytics")
    public Map<String, Object> getDashboardAnalytics() {
        List<User> users = userRepository.findAll();
        List<Lecture> lectures = lectureRepository.findAll();

        long totalUsers = users.size();
        long activeUsers = users.stream().filter(u -> "ACTIVE".equalsIgnoreCase(u.getStatus()) || u.getStatus() == null).count();
        long deactivatedUsers = users.stream().filter(u -> "DEACTIVATED".equalsIgnoreCase(u.getStatus())).count();
        long pendingUsers = users.stream().filter(u -> "PENDING_APPROVAL".equalsIgnoreCase(u.getStatus())).count();

        long studentCount = users.stream().filter(u -> "STUDENT".equalsIgnoreCase(u.getRole())).count();
        long facultyCount = users.stream().filter(u -> "FACULTY".equalsIgnoreCase(u.getRole())).count();

        long totalLectures = lectures.size();
        long approvedLectures = lectures.stream().filter(l -> "APPROVED".equalsIgnoreCase(l.getStatus()) || l.getStatus() == null).count();
        long pendingLectures = lectures.stream().filter(l -> "PENDING".equalsIgnoreCase(l.getStatus())).count();

        long totalViews = lectures.stream().mapToLong(Lecture::getViews).sum();

        List<Lecture> mostWatched = lectures.stream()
                .sorted((a, b) -> Integer.compare(b.getViews(), a.getViews()))
                .limit(5)
                .toList();

        Map<String, Object> res = new HashMap<>();
        res.put("totalUsers", totalUsers);
        res.put("activeUsers", activeUsers);
        res.put("deactivatedUsers", deactivatedUsers);
        res.put("pendingUsers", pendingUsers);
        res.put("studentCount", studentCount);
        res.put("facultyCount", facultyCount);
        res.put("totalLectures", totalLectures);
        res.put("approvedLectures", approvedLectures);
        res.put("pendingLectures", pendingLectures);
        res.put("totalViews", totalViews);
        res.put("mostWatchedLectures", mostWatched);
        return res;
    }

    // ==========================================
    // 8. SECURITY & ACTIVITY LOGS
    // ==========================================
    @GetMapping("/logs")
    public List<ActivityLog> getActivityLogs() {
        List<ActivityLog> logs = logRepository.findTop50ByOrderByTimestampDesc();
        if (logs.isEmpty()) {
            // Seed a welcome audit log
            ActivityLog initial = new ActivityLog(
                    "SYSTEM_INIT",
                    "System",
                    "ADHYAY Platform",
                    "Security audit log engine initialized for Walchand College"
            );
            return List.of(logRepository.save(initial));
        }
        return logs;
    }

    @PostMapping("/logs")
    public ResponseEntity<?> recordCustomLog(@RequestBody ActivityLog log) {
        if (log.getTimestamp() == null) log.setTimestamp(Instant.now());
        ActivityLog saved = logRepository.save(log);
        return ResponseEntity.ok(saved);
    }
}
