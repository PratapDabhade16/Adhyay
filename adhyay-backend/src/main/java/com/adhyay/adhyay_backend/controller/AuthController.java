package com.adhyay.adhyay_backend.controller;

import com.adhyay.adhyay_backend.dto.auth.*;
import com.adhyay.adhyay_backend.model.RefreshToken;
import com.adhyay.adhyay_backend.model.User;
import com.adhyay.adhyay_backend.repository.RefreshTokenRepository;
import com.adhyay.adhyay_backend.repository.UserRepository;
import com.adhyay.adhyay_backend.security.JwtService;
import com.adhyay.adhyay_backend.service.AuthRateLimiterService;
import com.adhyay.adhyay_backend.service.OtpService;
import com.adhyay.adhyay_backend.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;
    private final OtpService otpService;
    private final JwtService jwtService;
    private final AuthRateLimiterService rateLimiterService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public AuthController(
            UserService userService,
            OtpService otpService,
            JwtService jwtService,
            AuthRateLimiterService rateLimiterService,
            RefreshTokenRepository refreshTokenRepository,
            UserRepository userRepository) {
        this.userService = userService;
        this.otpService = otpService;
        this.jwtService = jwtService;
        this.rateLimiterService = rateLimiterService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @GetMapping("/test")
    public String test() {
        return "AuthController is active with JWT, 2FA, Rate Limiting and @walchandsangli.ac.in enforcement";
    }

    public record GoogleLoginRequest(String email, String name, String role, String department, String rollNumber) {}

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(
            @Valid @RequestBody SendOtpRequest request,
            HttpServletRequest httpRequest) {

        String ip = getClientIp(httpRequest);
        rateLimiterService.checkAuthAction(ip, request.email(), "OTP send");

        otpService.validateDomain(request.email());
        String otp = otpService.generateAndSaveOtp(request.email());

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "2-Step verification OTP sent to your @walchandsangli.ac.in inbox");
        response.put("otp", otp);
        response.put("expiresInSeconds", 300);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request,
            HttpServletRequest httpRequest) {

        String ip = getClientIp(httpRequest);
        rateLimiterService.checkAuthAction(ip, request.email(), "OTP verification");

        boolean isValid = otpService.verifyOtp(request.email(), request.otp());
        if (!isValid) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid or expired OTP code"));
        }

        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "OTP verified successfully"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {

        String ip = getClientIp(httpRequest);
        rateLimiterService.checkAuthAction(ip, request.email(), "registration");

        User registeredUser = userService.register(request);
        registeredUser.setPassword(null);

        String accessToken = jwtService.generateAccessToken(registeredUser);
        String refreshToken = jwtService.generateRefreshToken(registeredUser);

        AuthResponse authResponse = new AuthResponse(
                accessToken,
                refreshToken,
                jwtService.getAccessTokenExpirationSeconds(),
                registeredUser
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(authResponse);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest httpRequest) {

        String ip = getClientIp(httpRequest);
        rateLimiterService.checkAuthAction(ip, loginRequest.email(), "login");

        User user = userService.loginUser(
                loginRequest.email(),
                loginRequest.password()
        );

        user.setPassword(null);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        AuthResponse authResponse = new AuthResponse(
                accessToken,
                refreshToken,
                jwtService.getAccessTokenExpirationSeconds(),
                user
        );

        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(
            @RequestBody GoogleLoginRequest request,
            HttpServletRequest httpRequest) {

        String ip = getClientIp(httpRequest);
        rateLimiterService.checkAuthAction(ip, request.email(), "Google login");

        User user = userService.handleGoogleLogin(
                request.email(),
                request.name(),
                request.role(),
                request.department(),
                request.rollNumber()
        );

        user.setPassword(null);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        AuthResponse authResponse = new AuthResponse(
                accessToken,
                refreshToken,
                jwtService.getAccessTokenExpirationSeconds(),
                user
        );

        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        String tokenHash = JwtService.hashToken(request.refreshToken().trim());

        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElse(null);

        if (storedToken == null || storedToken.isRevoked() || storedToken.isExpired()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Invalid or expired refresh token. Please sign in again."
            ));
        }

        // Revoke the old refresh token (Token Rotation)
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        User user = userRepository.findById(storedToken.getUserId()).orElse(null);
        if (user == null || "DEACTIVATED".equalsIgnoreCase(user.getStatus())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "User account is no longer active."
            ));
        }

        user.setPassword(null);

        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshToken = jwtService.generateRefreshToken(user);

        AuthResponse authResponse = new AuthResponse(
                newAccessToken,
                newRefreshToken,
                jwtService.getAccessTokenExpirationSeconds(),
                user
        );

        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) RefreshTokenRequest request) {
        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            String tokenHash = JwtService.hashToken(request.refreshToken().trim());
            refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
            });
        }

        SecurityContextHolder.clearContext();

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Logged out successfully"
        ));
    }
}
