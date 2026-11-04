package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.AiQuestion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AiQuestionRepository extends MongoRepository<AiQuestion, String> {
    List<AiQuestion> findByLectureIdOrderByCreatedAtDesc(String lectureId);
    List<AiQuestion> findByCreatedAtAfter(Instant after);
    long countByLectureId(String lectureId);
}

