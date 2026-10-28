package com.adhyay.adhyay_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "activity_logs")
@JsonIgnoreProperties(ignoreUnknown = true)
public class ActivityLog {

    @Id
    private String id;

    private String action;       // e.g. ACCOUNT_ACTIVATED, ACCOUNT_DEACTIVATED, ACCOUNT_DELETED, REGISTRATION_APPROVED, LECTURE_DELETED, SUBJECT_CREATED
    private String performedBy;  // Admin email or name
    private String target;       // Target user or lecture or subject
    private String details;      // Human-readable description
    private Instant timestamp;

    public ActivityLog() {
        this.timestamp = Instant.now();
    }

    public ActivityLog(String action, String performedBy, String target, String details) {
        this.action = action;
        this.performedBy = performedBy;
        this.target = target;
        this.details = details;
        this.timestamp = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getPerformedBy() {
        return performedBy;
    }

    public void setPerformedBy(String performedBy) {
        this.performedBy = performedBy;
    }

    public String getTarget() {
        return target;
    }

    public void setTarget(String target) {
        this.target = target;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
