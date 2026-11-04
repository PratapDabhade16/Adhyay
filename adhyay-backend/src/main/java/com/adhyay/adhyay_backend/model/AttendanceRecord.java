package com.adhyay.adhyay_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "attendance_records")
@CompoundIndexes({
    @CompoundIndex(name = "session_student_unique", def = "{'sessionId': 1, 'studentId': 1}", unique = true)
})
@JsonIgnoreProperties(ignoreUnknown = true)
public class AttendanceRecord {

    @Id
    private String id;

    @Indexed
    private String sessionId;

    @Indexed
    private String subjectId;
    private String subjectName;

    @Indexed
    private String studentId;
    private String studentName;
    private String studentEmail;
    private String studentRollNumber;
    private String branch;

    private Instant markedAt = Instant.now();
    private String source = "CODE"; // "CODE" or "MANUAL_FACULTY"

    public AttendanceRecord() {
        this.markedAt = Instant.now();
        this.source = "CODE";
    }

    public AttendanceRecord(String sessionId, String subjectId, String subjectName, String studentId, String studentName, String studentEmail, String studentRollNumber, String branch, String source) {
        this.sessionId = sessionId;
        this.subjectId = subjectId;
        this.subjectName = subjectName;
        this.studentId = studentId;
        this.studentName = studentName;
        this.studentEmail = studentEmail;
        this.studentRollNumber = studentRollNumber;
        this.branch = branch;
        this.markedAt = Instant.now();
        this.source = source != null ? source : "CODE";
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
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

    public String getStudentRollNumber() {
        return studentRollNumber;
    }

    public void setStudentRollNumber(String studentRollNumber) {
        this.studentRollNumber = studentRollNumber;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public Instant getMarkedAt() {
        return markedAt;
    }

    public void setMarkedAt(Instant markedAt) {
        this.markedAt = markedAt;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }
}

