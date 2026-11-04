package com.adhyay.adhyay_backend.service;

import com.adhyay.adhyay_backend.model.*;
import com.adhyay.adhyay_backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);
    private static final long CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

    private final WatchProgressRepository watchProgressRepository;
    private final LectureRepository lectureRepository;
    private final UserRepository userRepository;
    private final AiQuestionRepository aiQuestionRepository;
    private final ActivityLogRepository activityLogRepository;
    private final CourseMaterialRepository courseMaterialRepository;

    private record CacheEntry(long timestamp, Object data) {}
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public AnalyticsService(
            WatchProgressRepository watchProgressRepository,
            LectureRepository lectureRepository,
            UserRepository userRepository,
            AiQuestionRepository aiQuestionRepository,
            ActivityLogRepository activityLogRepository,
            CourseMaterialRepository courseMaterialRepository) {
        this.watchProgressRepository = watchProgressRepository;
        this.lectureRepository = lectureRepository;
        this.userRepository = userRepository;
        this.aiQuestionRepository = aiQuestionRepository;
        this.activityLogRepository = activityLogRepository;
        this.courseMaterialRepository = courseMaterialRepository;
    }

    // ========================================================
    // 1. FACULTY ANALYTICS
    // ========================================================
    @SuppressWarnings("unchecked")
    public Map<String, Object> getFacultyAnalytics(String facultyEmail, String lectureId, String subject) {
        String cacheKey = "fac_" + (facultyEmail != null ? facultyEmail : "all") + "_" +
                (lectureId != null ? lectureId : "none") + "_" + (subject != null ? subject : "all");

        CacheEntry cached = cache.get(cacheKey);
        if (cached != null && (System.currentTimeMillis() - cached.timestamp < CACHE_TTL_MS)) {
            return (Map<String, Object>) cached.data;
        }

        Map<String, Object> result = new LinkedHashMap<>();

        // If a specific lecture is selected
        if (lectureId != null && !lectureId.isBlank()) {
            Lecture lecture = lectureRepository.findById(lectureId).orElse(null);
            if (lecture != null) {
                result.put("selectedLecture", Map.of(
                        "id", lecture.getId(),
                        "title", lecture.getTitle() != null ? lecture.getTitle() : "Untitled",
                        "subject", lecture.getSubject() != null ? lecture.getSubject() : "General",
                        "views", lecture.getViews(),
                        "durationSeconds", lecture.getDurationSeconds()
                ));

                List<WatchProgress> progresses = watchProgressRepository.findByLectureId(lectureId);
                int studentCount = progresses.size();
                long completedCount = progresses.stream().filter(WatchProgress::isCompleted).count();

                double avgWatchPct = progresses.isEmpty() ? 0.0 :
                        progresses.stream().mapToDouble(p -> {
                            if (p.getDurationSeconds() <= 0) return 0.0;
                            return Math.min(100.0, (p.getPositionSeconds() / p.getDurationSeconds()) * 100.0);
                        }).average().orElse(0.0);

                // 10% Drop-off Buckets Histogram
                String[] bucketLabels = {"0-10%", "10-20%", "20-30%", "30-40%", "40-50%",
                        "50-60%", "60-70%", "70-80%", "80-90%", "90-100%"};
                int[] bucketCounts = new int[10];

                for (WatchProgress wp : progresses) {
                    if (wp.getDurationSeconds() > 0) {
                        double pct = (wp.getPositionSeconds() / wp.getDurationSeconds()) * 100.0;
                        int idx = Math.min(9, Math.max(0, (int) (pct / 10.0)));
                        bucketCounts[idx]++;
                    }
                }

                // AI Questions asked for this lecture
                List<AiQuestion> aiQuestions = aiQuestionRepository.findByLectureIdOrderByCreatedAtDesc(lectureId);
                Map<String, Long> questionFreq = aiQuestions.stream()
                        .map(AiQuestion::getQuestion)
                        .filter(Objects::nonNull)
                        .collect(Collectors.groupingBy(q -> q.trim().toLowerCase(), Collectors.counting()));

                List<Map<String, Object>> topQuestions = questionFreq.entrySet().stream()
                        .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                        .limit(6)
                        .map(e -> Map.<String, Object>of("question", e.getKey(), "count", e.getValue()))
                        .toList();

                result.put("views", lecture.getViews());
                result.put("uniqueStudents", studentCount);
                result.put("completedCount", completedCount);
                result.put("completionRate", studentCount > 0 ? Math.round((double) completedCount / studentCount * 100.0) : 0);
                result.put("averageWatchPercentage", Math.round(avgWatchPct * 10.0) / 10.0);
                result.put("dropoffHistogram", Map.of(
                        "labels", bucketLabels,
                        "data", bucketCounts
                ));
                result.put("topAiQuestions", topQuestions);
                result.put("totalAiQuestions", aiQuestions.size());
            }
        }

        // List all lectures uploaded by faculty (or subject) for dropdown and comparative table
        List<Lecture> allLectures = (facultyEmail != null && !facultyEmail.isBlank())
                ? lectureRepository.findByUploadedBy(facultyEmail)
                : lectureRepository.findAll();

        if (allLectures.isEmpty()) {
            allLectures = lectureRepository.findAll();
        }

        List<Map<String, Object>> lectureSummaryList = new ArrayList<>();
        for (Lecture lec : allLectures) {
            List<WatchProgress> wps = watchProgressRepository.findByLectureId(lec.getId());
            double avgPct = wps.isEmpty() ? 0.0 :
                    wps.stream().mapToDouble(p -> p.getDurationSeconds() > 0 ? Math.min(100.0, (p.getPositionSeconds() / p.getDurationSeconds()) * 100.0) : 0.0).average().orElse(0.0);
            long comp = wps.stream().filter(WatchProgress::isCompleted).count();
            long aiCount = aiQuestionRepository.countByLectureId(lec.getId());

            lectureSummaryList.add(Map.of(
                    "id", lec.getId(),
                    "title", lec.getTitle() != null ? lec.getTitle() : "Untitled",
                    "subject", lec.getSubject() != null ? lec.getSubject() : "General",
                    "views", lec.getViews(),
                    "studentCount", wps.size(),
                    "avgWatchPct", Math.round(avgPct * 10.0) / 10.0,
                    "completedCount", comp,
                    "aiQuestionsCount", aiCount
            ));
        }

        result.put("lecturesList", lectureSummaryList);
        cache.put(cacheKey, new CacheEntry(System.currentTimeMillis(), result));
        return result;
    }

    // ========================================================
    // 2. ADMIN INSTITUTIONAL ANALYTICS
    // ========================================================
    @SuppressWarnings("unchecked")
    public Map<String, Object> getAdminAnalytics() {
        String cacheKey = "admin_analytics_summary";
        CacheEntry cached = cache.get(cacheKey);
        if (cached != null && (System.currentTimeMillis() - cached.timestamp < CACHE_TTL_MS)) {
            return (Map<String, Object>) cached.data;
        }

        Map<String, Object> result = new LinkedHashMap<>();

        // 1. User metrics
        List<User> users = userRepository.findAll();
        long totalUsers = users.size();
        long studentCount = users.stream().filter(u -> "STUDENT".equalsIgnoreCase(u.getRole())).count();
        long facultyCount = users.stream().filter(u -> "FACULTY".equalsIgnoreCase(u.getRole())).count();
        long adminCount = users.stream().filter(u -> "ADMIN".equalsIgnoreCase(u.getRole())).count();

        // Active users (created or updated in last 30 days)
        Instant thirtyDaysAgo = Instant.now().minus(30, ChronoUnit.DAYS);
        long activeUsers = users.stream()
                .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isAfter(thirtyDaysAgo))
                .count();
        if (activeUsers < totalUsers && activeUsers == 0) {
            activeUsers = totalUsers; // fallback for initial seeded users
        }

        result.put("users", Map.of(
                "total", totalUsers,
                "students", studentCount,
                "faculty", facultyCount,
                "admin", adminCount,
                "active", activeUsers
        ));

        // 2. Uploads per week (last 8 weeks)
        List<Lecture> lectures = lectureRepository.findAll();
        Map<String, Integer> weeklyUploads = new LinkedHashMap<>();
        LocalDate now = LocalDate.now();

        for (int i = 7; i >= 0; i--) {
            LocalDate startOfWeek = now.minusWeeks(i).with(java.time.DayOfWeek.MONDAY);
            String label = "W " + startOfWeek.format(DateTimeFormatter.ofPattern("dd MMM"));
            weeklyUploads.put(label, 0);
        }

        for (Lecture lec : lectures) {
            if (lec.getCreatedAt() != null) {
                LocalDate date = lec.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
                for (int i = 7; i >= 0; i--) {
                    LocalDate startOfWeek = now.minusWeeks(i).with(java.time.DayOfWeek.MONDAY);
                    LocalDate endOfWeek = startOfWeek.plusDays(6);
                    if (!date.isBefore(startOfWeek) && !date.isAfter(endOfWeek)) {
                        String label = "W " + startOfWeek.format(DateTimeFormatter.ofPattern("dd MMM"));
                        weeklyUploads.put(label, weeklyUploads.getOrDefault(label, 0) + 1);
                        break;
                    }
                }
            }
        }

        result.put("weeklyUploads", Map.of(
                "labels", weeklyUploads.keySet().toArray(new String[0]),
                "counts", weeklyUploads.values().toArray(new Integer[0])
        ));

        // 3. Storage estimate
        long totalMaterials = courseMaterialRepository.count();
        double estimatedVideoStorageGB = lectures.size() * 0.25; // ~250MB per lecture
        double estimatedMaterialStorageMB = totalMaterials * 5.0; // ~5MB per file
        double totalStorageGB = estimatedVideoStorageGB + (estimatedMaterialStorageMB / 1024.0);

        result.put("storage", Map.of(
                "totalLectures", lectures.size(),
                "totalMaterials", totalMaterials,
                "estimatedGB", Math.round(totalStorageGB * 100.0) / 100.0
        ));

        // 4. AI Assistant Usage and Health
        long totalAiQuestions = aiQuestionRepository.count();
        long doneTranscripts = lectures.stream().filter(l -> "DONE".equalsIgnoreCase(l.getTranscriptStatus())).count();
        long failedTranscripts = lectures.stream().filter(l -> "FAILED".equalsIgnoreCase(l.getTranscriptStatus())).count();
        long pendingTranscripts = lectures.stream().filter(l -> "PENDING".equalsIgnoreCase(l.getTranscriptStatus())).count();
        long totalTranscripts = doneTranscripts + failedTranscripts + pendingTranscripts;
        double failureRate = totalTranscripts > 0 ? ((double) failedTranscripts / totalTranscripts) * 100.0 : 0.0;

        result.put("aiHealth", Map.of(
                "totalQuestionsAsked", totalAiQuestions,
                "transcriptionsReady", doneTranscripts,
                "transcriptionsFailed", failedTranscripts,
                "transcriptionsPending", pendingTranscripts,
                "failureRatePercent", Math.round(failureRate * 10.0) / 10.0
        ));

        // 5. Recent Activity Logs summary
        List<ActivityLog> recentLogs = activityLogRepository.findTop50ByOrderByTimestampDesc();
        result.put("recentLogsCount", recentLogs.size());

        cache.put(cacheKey, new CacheEntry(System.currentTimeMillis(), result));
        return result;
    }

    // ========================================================
    // 3. AUDIT LOGS CSV EXPORT
    // ========================================================
    public String exportAuditLogsCsv(String userEmail, String action, Instant start, Instant end) {
        List<ActivityLog> logs;
        if (start != null && end != null) {
            logs = activityLogRepository.findByTimestampBetweenOrderByTimestampDesc(start, end);
        } else if (userEmail != null && !userEmail.isBlank()) {
            logs = activityLogRepository.findByPerformedByContainingIgnoreCaseOrderByTimestampDesc(userEmail);
        } else {
            logs = activityLogRepository.findAllByOrderByTimestampDesc();
        }

        if (action != null && !action.isBlank()) {
            logs = logs.stream()
                    .filter(l -> action.equalsIgnoreCase(l.getAction()))
                    .toList();
        }

        StringBuilder sb = new StringBuilder();
        // RFC 4180 CSV Header
        sb.append("\"Timestamp\",\"Performed By\",\"Action\",\"Target\",\"Details\"\n");

        DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;
        for (ActivityLog log : logs) {
            sb.append('"').append(log.getTimestamp() != null ? fmt.format(log.getTimestamp()) : "").append("\",");
            sb.append('"').append(escapeCsv(log.getPerformedBy())).append("\",");
            sb.append('"').append(escapeCsv(log.getAction())).append("\",");
            sb.append('"').append(escapeCsv(log.getTarget())).append("\",");
            sb.append('"').append(escapeCsv(log.getDetails())).append("\"\n");
        }

        return sb.toString();
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        return val.replace("\"", "\"\"");
    }
}
