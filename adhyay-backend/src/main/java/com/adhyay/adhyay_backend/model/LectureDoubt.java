package com.adhyay.adhyay_backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "lecture_doubts")
public class LectureDoubt {

    @Id
    private String id;

    @Indexed
    private String lectureId;
    private String lectureTitle;

    private String subjectId;
    private String subjectName;

    private String studentId;
    private String studentName;
    private String studentEmail;
    private String studentRole = "STUDENT";

    private String question;
    private Integer videoTimestamp; // Optional playback seconds when asked
    private String formattedTimestamp; // e.g. "04:15"
    private Instant createdAt = Instant.now();

    // Faculty Reply Fields (kept for backward-compatibility)
    private String facultyReply;
    private String repliedBy; // Faculty name or email
    private Instant repliedAt;
    private String status = "OPEN"; // OPEN, ANSWERED, RESOLVED

    // Multi-reply Threading & Accepted Answer
    private List<DoubtReply> replies = new ArrayList<>();
    private String acceptedReplyId;

    public LectureDoubt() {
        this.createdAt = Instant.now();
        this.status = "OPEN";
        this.replies = new ArrayList<>();
    }

    public LectureDoubt(String lectureId, String lectureTitle, String studentId, String studentName, String studentEmail, String question) {
        this.lectureId = lectureId;
        this.lectureTitle = lectureTitle;
        this.studentId = studentId;
        this.studentName = studentName;
        this.studentEmail = studentEmail;
        this.question = question;
        this.createdAt = Instant.now();
        this.status = "OPEN";
        this.replies = new ArrayList<>();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getStudentEmail() {
        return studentEmail;
    }

    public void setStudentEmail(String studentEmail) {
        this.studentEmail = studentEmail;
    }

    public String getStudentRole() {
        return studentRole;
    }

    public void setStudentRole(String studentRole) {
        this.studentRole = studentRole;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public Integer getVideoTimestamp() {
        return videoTimestamp;
    }

    public void setVideoTimestamp(Integer videoTimestamp) {
        this.videoTimestamp = videoTimestamp;
    }

    public String getFormattedTimestamp() {
        return formattedTimestamp;
    }

    public void setFormattedTimestamp(String formattedTimestamp) {
        this.formattedTimestamp = formattedTimestamp;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getFacultyReply() {
        return facultyReply;
    }

    public void setFacultyReply(String facultyReply) {
        this.facultyReply = facultyReply;
    }

    public String getRepliedBy() {
        return repliedBy;
    }

    public void setRepliedBy(String repliedBy) {
        this.repliedBy = repliedBy;
    }

    public Instant getRepliedAt() {
        return repliedAt;
    }

    public void setRepliedAt(Instant repliedAt) {
        this.repliedAt = repliedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<DoubtReply> getReplies() {
        if (replies == null) {
            replies = new ArrayList<>();
        }
        return replies;
    }

    public void setReplies(List<DoubtReply> replies) {
        this.replies = replies != null ? replies : new ArrayList<>();
    }

    public String getAcceptedReplyId() {
        return acceptedReplyId;
    }

    public void setAcceptedReplyId(String acceptedReplyId) {
        this.acceptedReplyId = acceptedReplyId;
    }
}
