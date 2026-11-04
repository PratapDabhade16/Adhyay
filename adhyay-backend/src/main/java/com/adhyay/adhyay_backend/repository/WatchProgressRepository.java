package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.WatchProgress;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WatchProgressRepository extends MongoRepository<WatchProgress, String> {

    Optional<WatchProgress> findByStudentIdAndLectureId(String studentId, String lectureId);

    Optional<WatchProgress> findByStudentEmailAndLectureId(String studentEmail, String lectureId);

    List<WatchProgress> findByStudentIdOrderByUpdatedAtDesc(String studentId);

    List<WatchProgress> findByStudentEmailOrderByUpdatedAtDesc(String studentEmail);

    List<WatchProgress> findByStudentIdAndCompletedFalseOrderByUpdatedAtDesc(String studentId);

    List<WatchProgress> findByStudentEmailAndCompletedFalseOrderByUpdatedAtDesc(String studentEmail);

    List<WatchProgress> findByLectureId(String lectureId);

    long countBySubjectAndStudentIdAndCompletedTrue(String subject, String studentId);

    long countBySubjectAndStudentEmailAndCompletedTrue(String subject, String studentEmail);

    long countBySubject(String subject);
}

