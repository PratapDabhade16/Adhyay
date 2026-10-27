package com.adhyay.adhyay_backend.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    public static final String REQUIRED_DOMAIN = "@walchandsangli.ac.in";
    private static final long OTP_VALIDITY_SECONDS = 300; // 5 minutes

    private static class OtpRecord {
        final String otp;
        final Instant expiry;

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
            return false;
        }

        String cleanEmail = email.trim().toLowerCase();
        OtpRecord record = otpStore.get(cleanEmail);

        if (record == null) {
            return false;
        }

        if (record.isExpired()) {
            otpStore.remove(cleanEmail);
            return false;
        }

        if (record.otp.equals(enteredOtp.trim())) {
            otpStore.remove(cleanEmail); // one-time use
            return true;
        }

        return false;
    }
}
