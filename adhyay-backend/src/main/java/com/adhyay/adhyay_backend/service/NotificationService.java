package com.adhyay.adhyay_backend.service;

import com.adhyay.adhyay_backend.model.CourseMaterial;
import com.adhyay.adhyay_backend.model.Notification;
import com.adhyay.adhyay_backend.model.User;
import com.adhyay.adhyay_backend.repository.CourseMaterialRepository;
import com.adhyay.adhyay_backend.repository.NotificationRepository;
import com.adhyay.adhyay_backend.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final EmailService emailService;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               CourseMaterialRepository courseMaterialRepository,
                               EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.courseMaterialRepository = courseMaterialRepository;
        this.emailService = emailService;
    }

    public Notification createNotification(String userId, String userEmail, String type, String title, String message, String link) {
        Notification notification = new Notification(userId, userEmail, type, title, message, link);
        return notificationRepository.save(notification);
    }

    public void broadcastToStudents(String type, String title, String message, String link, boolean sendEmail) {
        List<User> students = userRepository.findAll().stream()
                .filter(u -> "STUDENT".equalsIgnoreCase(u.getRole()))
                .toList();

        for (User student : students) {
            Notification n = new Notification(student.getId(), student.getEmail(), type, title, message, link);
            notificationRepository.save(n);

            if (sendEmail && student.getEmail() != null && !student.getEmail().isBlank()) {
                emailService.sendNotificationEmail(
                        student.getEmail(),
                        "ADHYAY Alert: " + title,
                        title,
                        message,
                        link
                );
            }
        }
    }

    public List<Notification> getUserNotifications(String userId, String userEmail) {
        if (userEmail != null && !userEmail.isBlank()) {
            return notificationRepository.findByUserEmailOrUserIdOrderByCreatedAtDesc(userEmail, userId);
        } else if (userId != null && !userId.isBlank()) {
            return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }
        return List.of();
    }

    public long getUnreadCount(String userId, String userEmail) {
        if (userEmail != null && !userEmail.isBlank()) {
            return notificationRepository.countByUserEmailAndReadFalse(userEmail);
        } else if (userId != null && !userId.isBlank()) {
            return notificationRepository.countByUserIdAndReadFalse(userId);
        }
        return 0L;
    }

    public Optional<Notification> markAsRead(String id) {
        return notificationRepository.findById(id).map(n -> {
            n.setRead(true);
            return notificationRepository.save(n);
        });
    }

    public void markAllAsRead(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) return;
        List<Notification> list = notificationRepository.findByUserEmailOrderByCreatedAtDesc(userEmail);
        for (Notification n : list) {
            n.setRead(true);
        }
        notificationRepository.saveAll(list);
    }

    /**
     * Scheduled Job: Runs every hour to check for assignment deadlines in the next 24 hours.
     * Prevents duplicate spam by checking if a reminder notification already exists.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void checkAssignmentDeadlinesJob() {
        Instant now = Instant.now();
        Instant in24Hours = now.plus(24, ChronoUnit.HOURS);

        List<CourseMaterial> upcomingAssignments = courseMaterialRepository
                .findByIsAssignmentTrueAndDeadlineBetweenOrderByDeadlineAsc(now, in24Hours);

        for (CourseMaterial assignment : upcomingAssignments) {
            String title = "⏰ Deadline Approaching: " + assignment.getTitle();
            String message = "Your assignment for " + assignment.getSubjectName() + " is due within the next 24 hours. Please review and submit on time.";
            String link = "student-dashboard.html#assignments";

            broadcastToStudents("ASSIGNMENT_DEADLINE", title, message, link, true);
        }
    }
}

