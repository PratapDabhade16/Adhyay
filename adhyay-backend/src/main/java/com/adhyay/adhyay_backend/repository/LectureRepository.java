package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.Lecture;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface LectureRepository extends MongoRepository<Lecture, String> {

    List<Lecture> findBySubject(String subject);

    List<Lecture> findBySubjectAndUnit(String subject, String unit);

    List<Lecture> findByUploadedBy(String uploadedBy);
}