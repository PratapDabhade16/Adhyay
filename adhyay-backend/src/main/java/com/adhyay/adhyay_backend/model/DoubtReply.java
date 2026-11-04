package com.adhyay.adhyay_backend.model;

import java.time.Instant;
import java.util.UUID;

public class DoubtReply {

    private String id;
    private String authorId;
    private String authorName;
    private String authorEmail;
    private String authorRole; // STUDENT or FACULTY
    private String text;
    private Instant createdAt;
    private boolean acceptedAnswer;

    public DoubtReply() {
        this.id = UUID.randomUUID().toString();
        this.createdAt = Instant.now();
        this.acceptedAnswer = false;
    }

    public DoubtReply(String authorId, String authorName, String authorEmail, String authorRole, String text) {
        this.id = UUID.randomUUID().toString();
        this.authorId = authorId;
        this.authorName = authorName;
        this.authorEmail = authorEmail;
        this.authorRole = authorRole;
        this.text = text;
        this.createdAt = Instant.now();
        this.acceptedAnswer = false;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAuthorId() {
        return authorId;
    }

    public void setAuthorId(String authorId) {
        this.authorId = authorId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public void setAuthorName(String authorName) {
        this.authorName = authorName;
    }

    public String getAuthorEmail() {
        return authorEmail;
    }

    public void setAuthorEmail(String authorEmail) {
        this.authorEmail = authorEmail;
    }

    public String getAuthorRole() {
        return authorRole;
    }

    public void setAuthorRole(String authorRole) {
        this.authorRole = authorRole;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isAcceptedAnswer() {
        return acceptedAnswer;
    }

    public void setAcceptedAnswer(boolean acceptedAnswer) {
        this.acceptedAnswer = acceptedAnswer;
    }
}

