package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.LectureDoubt;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LectureDoubtRepository extends MongoRepository<LectureDoubt, String> {

    List<LectureDoubt> findByLectureIdOrderByCreatedAtDesc(String lectureId);

    List<LectureDoubt> findBySubjectIdOrderByCreatedAtDesc(String subjectId);

    List<LectureDoubt> findBySubjectIdAndStatusOrderByCreatedAtDesc(String subjectId, String status);

    List<LectureDoubt> findByStatusOrderByCreatedAtDesc(String status);

    List<LectureDoubt> findAllByOrderByCreatedAtDesc();
}
