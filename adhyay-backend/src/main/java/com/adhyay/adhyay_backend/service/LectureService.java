package com.adhyay.adhyay_backend.service;

import com.adhyay.adhyay_backend.model.Lecture;
import com.adhyay.adhyay_backend.repository.LectureRepository;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;

@Service
public class LectureService {

    private final LectureRepository lectureRepository;
    private final Cloudinary cloudinary;
    private final LectureAiService lectureAiService;

    public LectureService(
            LectureRepository lectureRepository,
            Cloudinary cloudinary,
            @Lazy LectureAiService lectureAiService) {
        this.lectureRepository = lectureRepository;
        this.cloudinary = cloudinary;
        this.lectureAiService = lectureAiService;
    }

    public Lecture uploadLecture(
            MultipartFile video,
            String title,
            String description,
            String subject,
            String unit,
            int lectureNumber,
            String uploadedBy) throws IOException {

        if (video == null || video.isEmpty()) {
            throw new RuntimeException("Please select a video file");
        }

        String contentType = video.getContentType();

        if (contentType == null || !contentType.startsWith("video/")) {
            throw new RuntimeException("Only video files are allowed");
        }

        File temporaryVideo = File.createTempFile("adhyay-lecture-", ".upload");
        File aiVideoFile = File.createTempFile("adhyay-ai-", ".mp4");

        Map<?, ?> uploadResult;

        try {
            try (java.io.InputStream in = video.getInputStream()) {
                Files.copy(in, temporaryVideo.toPath(), StandardCopyOption.REPLACE_EXISTING);
            }

            // Create a dedicated local copy for the async FFmpeg transcription task
            try {
                Files.copy(temporaryVideo.toPath(), aiVideoFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            } catch (Exception e) {
                // If local copy fails, aiVideoFile will be null and the service will download from Cloudinary URL
                aiVideoFile = null;
            }

            uploadResult = cloudinary.uploader().uploadLarge(
                    temporaryVideo,
                    ObjectUtils.asMap(
                            "resource_type", "video",
                            "folder", "adhyay/lectures",
                            "chunk_size", 6000000
                    )
            );
        } finally {
            if (temporaryVideo.exists() && !temporaryVideo.delete()) {
                temporaryVideo.deleteOnExit();
            }
        }

        String videoUrl = uploadResult.get("secure_url").toString();
        String publicId = uploadResult.get("public_id").toString();

        Lecture lecture = new Lecture();
        lecture.setTitle(title);
        lecture.setDescription(description);
        lecture.setSubject(subject);
        lecture.setUnit(unit);
        lecture.setLectureNumber(lectureNumber);
        lecture.setVideoUrl(videoUrl);
        lecture.setPublicId(publicId);
        lecture.setUploadedBy(uploadedBy);
        lecture.setTranscriptStatus("PENDING");

        Lecture saved = lectureRepository.save(lecture);

        // Trigger Async Groq AI Transcription Job
        try {
            lectureAiService.processLectureTranscriptionAsync(saved.getId(), aiVideoFile);
        } catch (Exception ex) {
            // Log but don't fail the upload response
            ex.printStackTrace();
        }

        return saved;
    }

    public List<Lecture> getAllLectures() {
        return lectureRepository.findAll();
    }

    public List<Lecture> getLecturesBySubject(String subject) {
        return lectureRepository.findBySubject(subject);
    }

    public List<Lecture> getLecturesBySubjectAndUnit(
            String subject,
            String unit) {
        return lectureRepository.findBySubjectAndUnit(
                subject, unit
        );
    }

    public List<Lecture> getLecturesByFaculty(String uploadedBy) {
        return lectureRepository.findByUploadedBy(uploadedBy);
    }

    public void deleteLecture(String id) throws IOException {
        Lecture lecture = lectureRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Lecture not found"));

        if (lecture.getPublicId() != null) {
            cloudinary.uploader().destroy(
                    lecture.getPublicId(),
                    ObjectUtils.asMap(
                            "resource_type", "video"
                    )
            );
        }

        lectureRepository.deleteById(id);
    }

    public Lecture incrementViews(String id) {
        Lecture lecture = lectureRepository.findById(id).orElse(null);
        if (lecture != null) {
            lecture.setViews(lecture.getViews() + 1);
            return lectureRepository.save(lecture);
        }
        return null;
    }

    public Lecture updateLecture(String id, String title, String subject, String unit, int lectureNumber, String status) {
        Lecture lecture = lectureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lecture not found"));
        if (title != null && !title.isBlank()) lecture.setTitle(title);
        if (subject != null && !subject.isBlank()) lecture.setSubject(subject);
        if (unit != null && !unit.isBlank()) lecture.setUnit(unit);
        if (lectureNumber > 0) lecture.setLectureNumber(lectureNumber);
        if (status != null && !status.isBlank()) lecture.setStatus(status.toUpperCase());
        return lectureRepository.save(lecture);
    }
}
