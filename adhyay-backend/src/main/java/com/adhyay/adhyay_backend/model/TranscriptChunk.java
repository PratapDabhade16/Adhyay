package com.adhyay.adhyay_backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "transcript_chunks")
public class TranscriptChunk {

    @Id
    private String id;

    @Indexed
    private String lectureId;

    private String subject;
    private String unit;
    private double startTime;
    private double endTime;
    private String text;

    public TranscriptChunk() {
    }

    public TranscriptChunk(String lectureId, String subject, String unit, double startTime, double endTime, String text) {
        this.lectureId = lectureId;
        this.subject = subject;
        this.unit = unit;
        this.startTime = startTime;
        this.endTime = endTime;
        this.text = text;
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

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public double getStartTime() {
        return startTime;
    }

    public void setStartTime(double startTime) {
        this.startTime = startTime;
    }

    public double getEndTime() {
        return endTime;
    }

    public void setEndTime(double endTime) {
        this.endTime = endTime;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}

