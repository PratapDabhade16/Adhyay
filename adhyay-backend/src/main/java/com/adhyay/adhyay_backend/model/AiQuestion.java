package com.adhyay.adhyay_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "ai_questions")
@JsonIgnoreProperties(ignoreUnknown = true)
@CompoundIndex(name = "lecture_created_idx", def = "{'lectureId': 1, 'createdAt': -1}")
public class AiQuestion {

    @Id
    private String id;

    @Indexed
    private String lectureId;
    private String lectureTitle;
    private String question;
    private String askedByEmail;
    private Instant createdAt;

    public AiQuestion() {
        this.createdAt = Instant.now();
    }

    public AiQuestion(String lectureId, String lectureTitle, String question, String askedByEmail) {
        this.lectureId = lectureId;
        this.lectureTitle = lectureTitle;
        this.question = question;
        this.askedByEmail = askedByEmail;
        this.createdAt = Instant.now();
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

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getAskedByEmail() {
        return askedByEmail;
    }

    public void setAskedByEmail(String askedByEmail) {
        this.askedByEmail = askedByEmail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}

