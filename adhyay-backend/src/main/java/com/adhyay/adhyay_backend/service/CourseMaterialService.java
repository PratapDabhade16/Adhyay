package com.adhyay.adhyay_backend.service;

import com.adhyay.adhyay_backend.model.CourseMaterial;
import com.adhyay.adhyay_backend.model.Lecture;
import com.adhyay.adhyay_backend.repository.CourseMaterialRepository;
import com.adhyay.adhyay_backend.repository.LectureRepository;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CourseMaterialService {

    private final CourseMaterialRepository courseMaterialRepository;
    private final LectureRepository lectureRepository;
    private final Cloudinary cloudinary;
    private final NotificationService notificationService;

    public CourseMaterialService(CourseMaterialRepository courseMaterialRepository,
                                 LectureRepository lectureRepository,
                                 Cloudinary cloudinary,
                                 NotificationService notificationService) {
        this.courseMaterialRepository = courseMaterialRepository;
        this.lectureRepository = lectureRepository;
        this.cloudinary = cloudinary;
        this.notificationService = notificationService;
    }

    public CourseMaterial uploadMaterial(MultipartFile file,
                                         String title,
                                         String description,
                                         String subjectName,
                                         String lectureId,
                                         boolean isAssignment,
                                         Instant deadline,
                                         String facultyId,
                                         String facultyName) throws Exception {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String fileType = "PDF";
        int lastDot = originalFilename.lastIndexOf('.');
        if (lastDot > 0) {
            fileType = originalFilename.substring(lastDot + 1).toUpperCase();
        }

        // Upload to Cloudinary using raw resource type for PDF/PPT/DOC/ZIP
        Map<?, ?> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "resource_type", "raw",
                        "folder", "adhyay_materials",
                        "use_filename", true,
                        "unique_filename", true
                )
        );

        String fileUrl = (String) uploadResult.get("secure_url");
        if (fileUrl == null) {
            fileUrl = (String) uploadResult.get("url");
        }

        String lectureTitle = null;
        if (lectureId != null && !lectureId.isBlank()) {
            Optional<Lecture> lec = lectureRepository.findById(lectureId);
            if (lec.isPresent()) {
                lectureTitle = lec.get().getTitle();
                if (subjectName == null || subjectName.isBlank()) {
                    subjectName = lec.get().getSubject();
                }
            }
        }

        if (subjectName == null || subjectName.isBlank()) {
            subjectName = "General";
        }

        CourseMaterial material = new CourseMaterial(
                title != null && !title.isBlank() ? title : originalFilename,
                description,
                fileUrl,
                fileType,
                originalFilename,
                lectureId,
                lectureTitle,
                subjectName,
                facultyId,
                facultyName,
                isAssignment,
                deadline
        );

        CourseMaterial saved = courseMaterialRepository.save(material);

        // Notify students
        String notifType = isAssignment ? "ASSIGNMENT_DEADLINE" : "MATERIAL_UPLOADED";
        String notifTitle = isAssignment ? "📝 New Assignment: " + saved.getTitle() : "📄 New Course Material: " + saved.getTitle();
        String notifMsg = (isAssignment ? "Assignment posted for " : "Material uploaded for ") + subjectName + " by " + facultyName;
        String link = "student-dashboard.html#materials";

        notificationService.broadcastToStudents(notifType, notifTitle, notifMsg, link, isAssignment);

        return saved;
    }

    public List<CourseMaterial> getMaterials(String subjectName, String lectureId, Boolean isAssignment) {
        if (lectureId != null && !lectureId.isBlank()) {
            return courseMaterialRepository.findByLectureIdOrderByCreatedAtDesc(lectureId);
        }
        if (subjectName != null && !subjectName.isBlank() && !"ALL".equalsIgnoreCase(subjectName)) {
            List<CourseMaterial> list = courseMaterialRepository.findBySubjectNameOrderByCreatedAtDesc(subjectName);
            if (isAssignment != null) {
                return list.stream().filter(m -> m.isAssignment() == isAssignment).toList();
            }
            return list;
        }
        if (Boolean.TRUE.equals(isAssignment)) {
            return courseMaterialRepository.findByIsAssignmentTrueOrderByDeadlineAsc();
        }
        return courseMaterialRepository.findAllByOrderByCreatedAtDesc();
    }

    public boolean deleteMaterial(String id) {
        if (courseMaterialRepository.existsById(id)) {
            courseMaterialRepository.deleteById(id);
            return true;
        }
        return false;
    }
}

