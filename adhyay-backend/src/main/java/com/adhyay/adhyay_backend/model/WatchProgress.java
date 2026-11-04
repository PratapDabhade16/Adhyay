package com.adhyay.adhyay_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "watch_progress")
@CompoundIndexes({
    @CompoundIndex(name = "student_lecture_unique", def = "{'studentId': 1, 'lectureId': 1}", unique = true)
})
@JsonIgnoreProperties(ignoreUnknown = true)
public class WatchProgress {

    @Id
    private String id;

    @Indexed
    private String studentId;

    @Indexed
    private String studentEmail;

    @Indexed
    private String lectureId;
    private String lectureTitle;
    private String subject;
    private String videoUrl;

    private double positionSeconds = 0.0;
    private double durationSeconds = 0.0;

    private boolean completed = false; // Set to true when position >= 90% of duration
    private Instant updatedAt = Instant.now();

    public WatchProgress() {
        this.updatedAt = Instant.now();
    }

    public WatchProgress(String studentId, String studentEmail, String lectureId, String lectureTitle, String subject, String videoUrl, double positionSeconds, double durationSeconds) {
        this.studentId = studentId;
        this.studentEmail = studentEmail;
        this.lectureId = lectureId;
        this.lectureTitle = lectureTitle;
        this.subject = subject;
        this.videoUrl = videoUrl;
        this.positionSeconds = positionSeconds;
        this.durationSeconds = durationSeconds;
        this.completed = durationSeconds > 0 && positionSeconds >= (0.90 * durationSeconds);
        this.updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getStudentEmail() {
        return studentEmail;
    }

    public void setStudentEmail(String studentEmail) {
        this.studentEmail = studentEmail;
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

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getVideoUrl() {
        return videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }

    public double getPositionSeconds() {
        return positionSeconds;
    }

    public void setPositionSeconds(double positionSeconds) {
        this.positionSeconds = positionSeconds;
        checkCompleted();
    }

    public double getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(double durationSeconds) {
        this.durationSeconds = durationSeconds;
        checkCompleted();
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void checkCompleted() {
        if (this.durationSeconds > 0 && this.positionSeconds >= (0.90 * this.durationSeconds)) {
            this.completed = true;
        }
    }
}

