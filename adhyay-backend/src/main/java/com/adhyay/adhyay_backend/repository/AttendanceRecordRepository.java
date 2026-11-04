package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.AttendanceRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends MongoRepository<AttendanceRecord, String> {

    boolean existsBySessionIdAndStudentId(String sessionId, String studentId);

    boolean existsBySessionIdAndStudentEmail(String sessionId, String studentEmail);

    List<AttendanceRecord> findBySessionIdOrderByMarkedAtDesc(String sessionId);

    List<AttendanceRecord> findByStudentIdOrderByMarkedAtDesc(String studentId);

    List<AttendanceRecord> findByStudentEmailOrderByMarkedAtDesc(String studentEmail);

    List<AttendanceRecord> findBySubjectIdAndStudentId(String subjectId, String studentId);

    List<AttendanceRecord> findBySubjectIdAndStudentEmail(String subjectId, String studentEmail);

    long countBySessionId(String sessionId);

    long countBySubjectIdAndStudentId(String subjectId, String studentId);

    long countBySubjectIdAndStudentEmail(String subjectId, String studentEmail);

    void deleteBySessionIdAndStudentId(String sessionId, String studentId);

    void deleteBySessionIdAndStudentEmail(String sessionId, String studentEmail);

    Optional<AttendanceRecord> findBySessionIdAndStudentEmail(String sessionId, String studentEmail);
}

