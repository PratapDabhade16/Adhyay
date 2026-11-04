package com.adhyay.adhyay_backend.service;

import com.adhyay.adhyay_backend.model.Lecture;
import com.adhyay.adhyay_backend.model.WatchProgress;
import com.adhyay.adhyay_backend.repository.LectureRepository;
import com.adhyay.adhyay_backend.repository.WatchProgressRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class WatchProgressService {

    private final WatchProgressRepository watchProgressRepository;
    private final LectureRepository lectureRepository;

    public WatchProgressService(WatchProgressRepository watchProgressRepository, LectureRepository lectureRepository) {
        this.watchProgressRepository = watchProgressRepository;
        this.lectureRepository = lectureRepository;
    }

    public WatchProgress saveProgress(String studentId, String studentEmail, String lectureId, double positionSeconds, double durationSeconds) {
        if (lectureId == null || lectureId.isBlank()) {
            throw new IllegalArgumentException("Lecture ID cannot be empty");
        }

        WatchProgress progress = null;
        if (studentId != null && !studentId.isBlank()) {
            progress = watchProgressRepository.findByStudentIdAndLectureId(studentId, lectureId).orElse(null);
        }
        if (progress == null && studentEmail != null && !studentEmail.isBlank()) {
            progress = watchProgressRepository.findByStudentEmailAndLectureId(studentEmail, lectureId).orElse(null);
        }

        Lecture lecture = lectureRepository.findById(lectureId).orElse(null);
        String lectureTitle = lecture != null && lecture.getTitle() != null ? lecture.getTitle() : "Lecture";
        String subject = lecture != null && lecture.getSubject() != null ? lecture.getSubject() : "General";
        String videoUrl = lecture != null ? lecture.getVideoUrl() : "";

        if (durationSeconds <= 0 && lecture != null && lecture.getDurationSeconds() > 0) {
            durationSeconds = lecture.getDurationSeconds();
        }

        if (progress == null) {
            progress = new WatchProgress(
                    studentId,
                    studentEmail,
                    lectureId,
                    lectureTitle,
                    subject,
                    videoUrl,
                    positionSeconds,
                    durationSeconds
            );
        } else {
            progress.setPositionSeconds(positionSeconds);
            if (durationSeconds > 0) {
                progress.setDurationSeconds(durationSeconds);
            }
            if (lectureTitle != null) progress.setLectureTitle(lectureTitle);
            if (subject != null) progress.setSubject(subject);
            if (videoUrl != null && !videoUrl.isBlank()) progress.setVideoUrl(videoUrl);
            progress.setUpdatedAt(Instant.now());
            progress.checkCompleted();
        }

        return watchProgressRepository.save(progress);
    }

    public Optional<WatchProgress> getProgress(String studentId, String studentEmail, String lectureId) {
        if (studentId != null && !studentId.isBlank()) {
            Optional<WatchProgress> p = watchProgressRepository.findByStudentIdAndLectureId(studentId, lectureId);
            if (p.isPresent()) return p;
        }
        if (studentEmail != null && !studentEmail.isBlank()) {
            return watchProgressRepository.findByStudentEmailAndLectureId(studentEmail, lectureId);
        }
        return Optional.empty();
    }

    public List<WatchProgress> getContinueWatching(String studentId, String studentEmail) {
        List<WatchProgress> list = new ArrayList<>();
        if (studentId != null && !studentId.isBlank()) {
            list = watchProgressRepository.findByStudentIdAndCompletedFalseOrderByUpdatedAtDesc(studentId);
        } else if (studentEmail != null && !studentEmail.isBlank()) {
            list = watchProgressRepository.findByStudentEmailAndCompletedFalseOrderByUpdatedAtDesc(studentEmail);
        }
        // Filter out lectures with less than 5 seconds watched
        return list.stream()
                .filter(p -> p.getPositionSeconds() > 5.0)
                .toList();
    }

    public List<WatchProgress> getWatchHistory(String studentId, String studentEmail) {
        if (studentId != null && !studentId.isBlank()) {
            return watchProgressRepository.findByStudentIdOrderByUpdatedAtDesc(studentId);
        } else if (studentEmail != null && !studentEmail.isBlank()) {
            return watchProgressRepository.findByStudentEmailOrderByUpdatedAtDesc(studentEmail);
        }
        return Collections.emptyList();
    }

    public Map<String, Object> getSubjectCompletionStats(String studentId, String studentEmail) {
        List<Lecture> allLectures = lectureRepository.findAll();
        Map<String, Long> totalPerSubject = new HashMap<>();
        for (Lecture l : allLectures) {
            String sub = l.getSubject() != null && !l.getSubject().isBlank() ? l.getSubject() : "General";
            totalPerSubject.put(sub, totalPerSubject.getOrDefault(sub, 0L) + 1L);
        }

        List<WatchProgress> allWatched = getWatchHistory(studentId, studentEmail);
        Map<String, Set<String>> completedLecturesPerSubject = new HashMap<>();
        for (WatchProgress p : allWatched) {
            if (p.isCompleted() && p.getSubject() != null) {
                completedLecturesPerSubject
                        .computeIfAbsent(p.getSubject(), k -> new HashSet<>())
                        .add(p.getLectureId());
            }
        }

        List<Map<String, Object>> subjectsList = new ArrayList<>();
        for (Map.Entry<String, Long> entry : totalPerSubject.entrySet()) {
            String subject = entry.getKey();
            long total = entry.getValue();
            long completed = completedLecturesPerSubject.getOrDefault(subject, Collections.emptySet()).size();
            double pct = total > 0 ? Math.min(100.0, Math.round((completed * 100.0 / total) * 10.0) / 10.0) : 0.0;

            Map<String, Object> item = new HashMap<>();
            item.put("subject", subject);
            item.put("totalLectures", total);
            item.put("completedLectures", completed);
            item.put("percentage", pct);
            subjectsList.add(item);
        }

        // Sort by subject name
        subjectsList.sort(Comparator.comparing(m -> String.valueOf(m.get("subject"))));

        Map<String, Object> response = new HashMap<>();
        response.put("subjects", subjectsList);
        return response;
    }
}

