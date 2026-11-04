package com.adhyay.adhyay_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "notifications")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Notification {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String userEmail;

    private String type; // NEW_LECTURE, MATERIAL_UPLOADED, ASSIGNMENT_DEADLINE, ANNOUNCEMENT, DOUBT_REPLY, SYSTEM
    private String title;
    private String message;
    private String link; // URL to navigate to when clicked
    private boolean read = false;
    private Instant createdAt = Instant.now();

    public Notification() {
        this.createdAt = Instant.now();
        this.read = false;
    }

    public Notification(String userId, String userEmail, String type, String title, String message, String link) {
        this.userId = userId;
        this.userEmail = userEmail;
        this.type = type;
        this.title = title;
        this.message = message;
        this.link = link;
        this.read = false;
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getLink() {
        return link;
    }

    public void setLink(String link) {
        this.link = link;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}

