package com.adhyay.adhyay_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "academic_subjects")
@JsonIgnoreProperties(ignoreUnknown = true)
public class AcademicSubject {

    @Id
    private String id;

    private String name;
    private String code;
    private String semester;
    private String department;
    private String assignedFacultyEmail;
    private String assignedFacultyName;
    private Instant createdAt;

    public AcademicSubject() {
        this.createdAt = Instant.now();
    }

    public AcademicSubject(String name, String code, String semester, String department, String assignedFacultyEmail, String assignedFacultyName) {
        this.name = name;
        this.code = code;
        this.semester = semester;
        this.department = department;
        this.assignedFacultyEmail = assignedFacultyEmail;
        this.assignedFacultyName = assignedFacultyName;
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getSemester() {
        return semester;
    }

    public void setSemester(String semester) {
        this.semester = semester;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getAssignedFacultyEmail() {
        return assignedFacultyEmail;
    }

    public void setAssignedFacultyEmail(String assignedFacultyEmail) {
        this.assignedFacultyEmail = assignedFacultyEmail;
    }

    public String getAssignedFacultyName() {
        return assignedFacultyName;
    }

    public void setAssignedFacultyName(String assignedFacultyName) {
        this.assignedFacultyName = assignedFacultyName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
