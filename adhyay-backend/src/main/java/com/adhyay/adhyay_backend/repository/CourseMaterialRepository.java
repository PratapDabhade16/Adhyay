package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.CourseMaterial;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface CourseMaterialRepository extends MongoRepository<CourseMaterial, String> {

    List<CourseMaterial> findBySubjectNameOrderByCreatedAtDesc(String subjectName);

    List<CourseMaterial> findByLectureIdOrderByCreatedAtDesc(String lectureId);

    List<CourseMaterial> findByIsAssignmentTrueOrderByDeadlineAsc();

    List<CourseMaterial> findByIsAssignmentTrueAndDeadlineBetweenOrderByDeadlineAsc(Instant start, Instant end);

    List<CourseMaterial> findAllByOrderByCreatedAtDesc();
}

