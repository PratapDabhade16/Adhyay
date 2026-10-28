package com.adhyay.adhyay_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "users")
@JsonIgnoreProperties(ignoreUnknown = true)
public class User {

    @Id
    private String id;

    private String name;

    private String email;

    private String password;

    private String role;

    private String department;

    private String rollNumber;

    private String status = "ACTIVE"; // ACTIVE, DEACTIVATED, PENDING_APPROVAL, REJECTED

    private Instant createdAt;

    // Default constructor
    public User() {
        this.status = "ACTIVE";
        this.createdAt = Instant.now();
    }

    // Constructor
    public User(String name, String email, String password, String role) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.role = role;
        this.createdAt = Instant.now();
    }

    // Getters and Setters

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    private String prnNumber;
    private String branch;

    public void setRole(String role) {
        this.role = role;
    }

    public String getDepartment() {
        return department != null ? department : branch;
    }

    public void setDepartment(String department) {
        this.department = department;
        this.branch = department;
    }

    public String getBranch() {
        return branch != null ? branch : department;
    }

    public void setBranch(String branch) {
        this.branch = branch;
        this.department = branch;
    }

    public String getRollNumber() {
        return rollNumber != null ? rollNumber : prnNumber;
    }

    public void setRollNumber(String rollNumber) {
        this.rollNumber = rollNumber;
        this.prnNumber = rollNumber;
    }

    public String getPrnNumber() {
        return prnNumber != null ? prnNumber : rollNumber;
    }

    public void setPrnNumber(String prnNumber) {
        this.prnNumber = prnNumber;
        this.rollNumber = prnNumber;
    }

    public String getStatus() {
        return status != null ? status : "ACTIVE";
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}