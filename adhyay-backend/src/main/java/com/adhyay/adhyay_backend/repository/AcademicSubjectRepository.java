package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.AcademicSubject;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AcademicSubjectRepository extends MongoRepository<AcademicSubject, String> {
    List<AcademicSubject> findBySemester(String semester);
    List<AcademicSubject> findByAssignedFacultyEmail(String assignedFacultyEmail);
}
