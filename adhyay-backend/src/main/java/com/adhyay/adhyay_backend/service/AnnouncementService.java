package com.adhyay.adhyay_backend.service;

import com.adhyay.adhyay_backend.model.Announcement;
import com.adhyay.adhyay_backend.repository.AnnouncementRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final NotificationService notificationService;

    public AnnouncementService(AnnouncementRepository announcementRepository, NotificationService notificationService) {
        this.announcementRepository = announcementRepository;
        this.notificationService = notificationService;
    }

    public Announcement createAnnouncement(String title, String content, String subjectName, String branch, String postedBy, String authorRole) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Announcement title cannot be empty");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Announcement content cannot be empty");
        }

        Announcement announcement = new Announcement(
                title.trim(),
                content.trim(),
                subjectName != null && !subjectName.isBlank() ? subjectName : "ALL",
                branch != null && !branch.isBlank() ? branch : "ALL",
                postedBy != null ? postedBy : "Faculty",
                authorRole != null ? authorRole : "FACULTY"
        );

        Announcement saved = announcementRepository.save(announcement);

        // Broadcast notification + async email
        String notifTitle = "📢 Announcement: " + saved.getTitle();
        String link = "student-dashboard.html#announcements";
        notificationService.broadcastToStudents("ANNOUNCEMENT", notifTitle, saved.getContent(), link, true);

        return saved;
    }

    public List<Announcement> getAnnouncements(String subjectName, String branch) {
        return announcementRepository.findAllByOrderByCreatedAtDesc();
    }

    public boolean deleteAnnouncement(String id) {
        if (announcementRepository.existsById(id)) {
            announcementRepository.deleteById(id);
            return true;
        }
        return false;
    }
}

