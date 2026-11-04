package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.AttendanceSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceSessionRepository extends MongoRepository<AttendanceSession, String> {

    List<AttendanceSession> findByFacultyIdAndActiveTrue(String facultyId);

    Optional<AttendanceSession> findFirstByFacultyIdAndActiveTrueOrderByStartTimeDesc(String facultyId);

    Optional<AttendanceSession> findFirstByCodeAndActiveTrue(String code);

    List<AttendanceSession> findBySubjectIdOrderByStartTimeDesc(String subjectId);

    List<AttendanceSession> findByBranchOrderByStartTimeDesc(String branch);

    List<AttendanceSession> findAllByOrderByStartTimeDesc();

    long countBySubjectId(String subjectId);
}

