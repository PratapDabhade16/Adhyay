package com.adhyay.adhyay_backend.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class OtpService {

    public static final String REQUIRED_DOMAIN = "@walchandsangli.ac.in";
    private static final long OTP_VALIDITY_SECONDS = 300; // 5 minutes
    private static final int MAX_FAILED_ATTEMPTS = 5;

    private static class OtpRecord {
        final String otp;
        final Instant expiry;
        final AtomicInteger failedAttempts = new AtomicInteger(0);
        volatile boolean locked = false;

        OtpRecord(String otp, Instant expiry) {
            this.otp = otp;
            this.expiry = expiry;
        }

        boolean isExpired() {
            return Instant.now().isAfter(expiry);
        }
    }

    private final Map<String, OtpRecord> otpStore = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();
    private final EmailService emailService;

    public OtpService(EmailService emailService) {
        this.emailService = emailService;
    }

    public void validateDomain(String email) {
        if (email == null || !email.trim().toLowerCase().endsWith(REQUIRED_DOMAIN)) {
            throw new RuntimeException("Access restricted: Only official " + REQUIRED_DOMAIN + " college accounts are permitted.");
        }
    }

    public String generateAndSaveOtp(String email) {
        validateDomain(email);
        String cleanEmail = email.trim().toLowerCase();

        // Generate 6 digit OTP
        int code = 100000 + secureRandom.nextInt(900000);
        String otp = String.valueOf(code);

        Instant expiry = Instant.now().plusSeconds(OTP_VALIDITY_SECONDS);
        otpStore.put(cleanEmail, new OtpRecord(otp, expiry));

        // Dispatch real email via email service
        boolean dispatched = emailService.sendOtpEmail(cleanEmail, otp);
        if (dispatched) {
            System.out.println("[2FA WCE OTP] Real email sent to " + cleanEmail);
        } else {
            System.out.println("[2FA WCE OTP] Email simulated / fallback mode for " + cleanEmail + ": " + otp);
        }

        return otp;
    }

    public boolean verifyOtp(String email, String enteredOtp) {
        validateDomain(email);
        if (enteredOtp == null || enteredOtp.trim().isEmpty()) {
            throw new RuntimeException("OTP code cannot be blank.");
        }

        String cleanEmail = email.trim().toLowerCase();
        OtpRecord record = otpStore.get(cleanEmail);

        if (record == null) {
            throw new RuntimeException("No active OTP found. Please request a new OTP code.");
        }

        if (record.locked) {
            throw new RuntimeException("This OTP code is locked due to 5 consecutive failed attempts. Please request a new OTP.");
        }

        if (record.isExpired()) {
            otpStore.remove(cleanEmail);
            throw new RuntimeException("OTP code has expired. Please request a new OTP code.");
        }

        if (record.otp.equals(enteredOtp.trim())) {
            otpStore.remove(cleanEmail); // one-time use
            return true;
        } else {
            int attempts = record.failedAttempts.incrementAndGet();
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                record.locked = true;
                throw new RuntimeException("Invalid OTP code. This OTP has been locked after 5 failed attempts. Please request a new OTP code.");
            }
            int remaining = MAX_FAILED_ATTEMPTS - attempts;
            throw new RuntimeException("Invalid OTP code. " + remaining + " attempt(s) remaining before lock.");
        }
    }
}
