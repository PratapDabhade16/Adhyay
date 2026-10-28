package com.adhyay.adhyay_backend.service;

import com.adhyay.adhyay_backend.model.User;
import com.adhyay.adhyay_backend.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class UserService {

    public static final String REQUIRED_DOMAIN = "@walchandsangli.ac.in";

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final OtpService otpService;

    public UserService(UserRepository userRepository, OtpService otpService) {
        this.userRepository = userRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
        this.otpService = otpService;
    }

    public void validateDomain(String email) {
        otpService.validateDomain(email);
    }

    public User registerUser(User user) {
        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            throw new RuntimeException("Email is required");
        }

        validateDomain(user.getEmail());
        String cleanEmail = user.getEmail().trim().toLowerCase();
        user.setEmail(cleanEmail);

        if (userRepository.existsByEmail(cleanEmail)) {
            throw new RuntimeException("Email already registered with an ADHYAY account");
        }

        if (user.getPassword() == null || user.getPassword().length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));

        if (user.getRole() == null || user.getRole().trim().isEmpty()) {
            user.setRole("STUDENT");
        } else {
            user.setRole(user.getRole().trim().toUpperCase());
        }

        return userRepository.save(user);
    }

    public User loginUser(String email, String password) {
        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email is required");
        }

        validateDomain(email);
        String cleanEmail = email.trim().toLowerCase();

        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        if ("DEACTIVATED".equalsIgnoreCase(user.getStatus())) {
            throw new RuntimeException("Your account has been deactivated by the administrator.");
        }
        if ("REJECTED".equalsIgnoreCase(user.getStatus())) {
            throw new RuntimeException("Your account registration was not approved.");
        }
        if ("PENDING_APPROVAL".equalsIgnoreCase(user.getStatus())) {
            throw new RuntimeException("Your account is awaiting administrative approval.");
        }

        return user;
    }

    public User handleGoogleLogin(String email, String name, String role, String department, String rollNumber) {
        validateDomain(email);
        String cleanEmail = email.trim().toLowerCase();

        return userRepository.findByEmail(cleanEmail).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(cleanEmail);
            newUser.setName(name != null && !name.isBlank() ? name : cleanEmail.split("@")[0]);
            newUser.setRole(role != null && !role.isBlank() ? role.toUpperCase() : "STUDENT");
            newUser.setDepartment(department != null && !department.isBlank() ? department : "General");
            newUser.setRollNumber(rollNumber);
            // Random secure password for Google-authenticated user
            newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            return userRepository.save(newUser);
        });
    }
}