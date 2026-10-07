package com.adhyay.adhyay_backend.service;

import com.adhyay.adhyay_backend.model.Lecture;
import com.adhyay.adhyay_backend.repository.LectureRepository;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
public class LectureService {

    private final LectureRepository lectureRepository;
    private final Cloudinary cloudinary;

    public LectureService(
            LectureRepository lectureRepository,
            Cloudinary cloudinary) {

        this.lectureRepository = lectureRepository;
        this.cloudinary = cloudinary;
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

        Map<?, ?> uploadResult = cloudinary.uploader().upload(
                video.getBytes(),
                ObjectUtils.asMap(
                        "resource_type", "video",
                        "folder", "adhyay/lectures"
                )
        );

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

        return lectureRepository.save(lecture);
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

        return lectureRepository.findBySubjectAndUnit(subject, unit);
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
}