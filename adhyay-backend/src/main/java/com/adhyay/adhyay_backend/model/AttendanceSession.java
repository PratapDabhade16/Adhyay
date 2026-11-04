package com.adhyay.adhyay_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "attendance_sessions")
@JsonIgnoreProperties(ignoreUnknown = true)
public class AttendanceSession {

    @Id
    private String id;

    @Indexed
    private String subjectId;
    private String subjectName;

    @Indexed
    private String facultyId;
    private String facultyName;
    private String facultyEmail;

    private String branch; // e.g. "Information Technology", "Computer Science", or "ALL"

    @Indexed
    private String code; // 6-digit rotating code
    private Instant startTime;
    private Instant expiresAt; // Valid for 2 minutes
    private boolean active = true;

    private Instant createdAt = Instant.now();

    public AttendanceSession() {
        this.startTime = Instant.now();
        this.createdAt = Instant.now();
        this.active = true;
    }

    public AttendanceSession(String subjectId, String subjectName, String facultyId, String facultyName, String facultyEmail, String branch, String code, Instant expiresAt) {
        this.subjectId = subjectId;
        this.subjectName = subjectName;
        this.facultyId = facultyId;
        this.facultyName = facultyName;
        this.facultyEmail = facultyEmail;
        this.branch = branch;
        this.code = code;
        this.startTime = Instant.now();
        this.expiresAt = expiresAt;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(String subjectId) {
        this.subjectId = subjectId;
    }

    public String getSubjectName() {
        return subjectName;
    }

    public void setSubjectName(String subjectName) {
        this.subjectName = subjectName;
    }

    public String getFacultyId() {
        return facultyId;
    }

    public void setFacultyId(String facultyId) {
        this.facultyId = facultyId;
    }

    public String getFacultyName() {
        return facultyName;
    }

    public void setFacultyName(String facultyName) {
        this.facultyName = facultyName;
    }

    public String getFacultyEmail() {
        return facultyEmail;
    }

    public void setFacultyEmail(String facultyEmail) {
        this.facultyEmail = facultyEmail;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Instant getStartTime() {
        return startTime;
    }

    public void setStartTime(Instant startTime) {
        this.startTime = startTime;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}

