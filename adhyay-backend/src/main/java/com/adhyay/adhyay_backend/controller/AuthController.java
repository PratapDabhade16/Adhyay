package com.adhyay.adhyay_backend.controller;

import com.adhyay.adhyay_backend.model.User;
import com.adhyay.adhyay_backend.service.OtpService;
import com.adhyay.adhyay_backend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;
    private final OtpService otpService;

    public AuthController(UserService userService, OtpService otpService) {
        this.userService = userService;
        this.otpService = otpService;
    }

    @GetMapping("/test")
    public String test() {
        return "AuthController is active with 2FA and @walchandsangli.ac.in enforcement";
    }

    public record SendOtpRequest(String email, String purpose) {}
    public record VerifyOtpRequest(String email, String otp) {}
    public record GoogleLoginRequest(String email, String name, String role, String department, String rollNumber) {}

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody SendOtpRequest request) {
        try {
            if (request.email() == null || request.email().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Email is required"));
            }

            // Enforce domain check
            otpService.validateDomain(request.email());

            String otp = otpService.generateAndSaveOtp(request.email());

            Map<String, Object> response = new HashMap<>();
            response.put("status", "SUCCESS");
            response.put("message", "2-Step verification OTP sent to your @walchandsangli.ac.in inbox");
            response.put("otp", otp); // Delivered for instantaneous WCE testing & demo
            response.put("expiresInSeconds", 300);

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody VerifyOtpRequest request) {
        try {
            boolean isValid = otpService.verifyOtp(request.email(), request.otp());
            if (!isValid) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid or expired OTP code"));
            }

            return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "OTP verified successfully"));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            User registeredUser = userService.registerUser(user);
            registeredUser.setPassword(null);

            return ResponseEntity.status(HttpStatus.CREATED).body(registeredUser);

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        try {
            User user = userService.loginUser(
                    loginRequest.getEmail(),
                    loginRequest.getPassword()
            );

            user.setPassword(null);
            return ResponseEntity.ok(user);

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        try {
            User user = userService.handleGoogleLogin(
                    request.email(),
                    request.name(),
                    request.role(),
                    request.department(),
                    request.rollNumber()
            );

            user.setPassword(null);
            return ResponseEntity.ok(user);

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }
}