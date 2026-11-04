package com.adhyay.adhyay_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "course_materials")
@JsonIgnoreProperties(ignoreUnknown = true)
public class CourseMaterial {

    @Id
    private String id;

    private String title;
    private String description;

    private String fileUrl;
    private String fileType; // PDF, PPT, DOC, ZIP, etc.
    private String fileName;

    @Indexed
    private String lectureId;
    private String lectureTitle;

    @Indexed
    private String subjectName;

    private String uploadedByFacultyId;
    private String uploadedByFacultyName;

    private boolean isAssignment = false;
    private Instant deadline; // Only present if isAssignment is true

    private Instant createdAt = Instant.now();

    public CourseMaterial() {
        this.createdAt = Instant.now();
    }

    public CourseMaterial(String title, String description, String fileUrl, String fileType, String fileName, String lectureId, String lectureTitle, String subjectName, String uploadedByFacultyId, String uploadedByFacultyName, boolean isAssignment, Instant deadline) {
        this.title = title;
        this.description = description;
        this.fileUrl = fileUrl;
        this.fileType = fileType;
        this.fileName = fileName;
        this.lectureId = lectureId;
        this.lectureTitle = lectureTitle;
        this.subjectName = subjectName;
        this.uploadedByFacultyId = uploadedByFacultyId;
        this.uploadedByFacultyName = uploadedByFacultyName;
        this.isAssignment = isAssignment;
        this.deadline = deadline;
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getFileUrl() {
        return fileUrl;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getLectureId() {
        return lectureId;
    }

    public void setLectureId(String lectureId) {
        this.lectureId = lectureId;
    }

    public String getLectureTitle() {
        return lectureTitle;
    }

    public void setLectureTitle(String lectureTitle) {
        this.lectureTitle = lectureTitle;
    }

    public String getSubjectName() {
        return subjectName;
    }

    public void setSubjectName(String subjectName) {
        this.subjectName = subjectName;
    }

    public String getUploadedByFacultyId() {
        return uploadedByFacultyId;
    }

    public void setUploadedByFacultyId(String uploadedByFacultyId) {
        this.uploadedByFacultyId = uploadedByFacultyId;
    }

    public String getUploadedByFacultyName() {
        return uploadedByFacultyName;
    }

    public void setUploadedByFacultyName(String uploadedByFacultyName) {
        this.uploadedByFacultyName = uploadedByFacultyName;
    }

    public boolean isAssignment() {
        return isAssignment;
    }

    public void setAssignment(boolean assignment) {
        isAssignment = assignment;
    }

    public Instant getDeadline() {
        return deadline;
    }

    public void setDeadline(Instant deadline) {
        this.deadline = deadline;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}

