package com.adhyay.adhyay_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "announcements")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Announcement {

    @Id
    private String id;

    private String title;
    private String content;

    @Indexed
    private String subjectName; // e.g. "Data Structures" or "ALL"

    @Indexed
    private String branch; // e.g. "Information Technology" or "ALL"

    private String postedBy; // Name or Email of author
    private String authorRole; // FACULTY or ADMIN

    private Instant createdAt = Instant.now();

    public Announcement() {
        this.createdAt = Instant.now();
    }

    public Announcement(String title, String content, String subjectName, String branch, String postedBy, String authorRole) {
        this.title = title;
        this.content = content;
        this.subjectName = subjectName != null && !subjectName.isBlank() ? subjectName : "ALL";
        this.branch = branch != null && !branch.isBlank() ? branch : "ALL";
        this.postedBy = postedBy;
        this.authorRole = authorRole;
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

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getSubjectName() {
        return subjectName;
    }

    public void setSubjectName(String subjectName) {
        this.subjectName = subjectName;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public String getPostedBy() {
        return postedBy;
    }

    public void setPostedBy(String postedBy) {
        this.postedBy = postedBy;
    }

    public String getAuthorRole() {
        return authorRole;
    }

    public void setAuthorRole(String authorRole) {
        this.authorRole = authorRole;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}

