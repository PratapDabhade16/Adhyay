package com.adhyay.adhyay_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class EmailService {

    @Value("${email.api.provider:resend}")
    private String provider;

    @Value("${email.api.key:re_azk8QYdQ_Grzh6WafFFQMvvCVHSqgsPeP}")
    private String apiKey;

    @Value("${email.from.address:onboarding@resend.dev}")
    private String fromAddress;

    @Value("${email.from.name:ADHYAY - Walchand College}")
    private String fromName;

    // Resend sandbox account owner email
    private final String resendSandboxEmail = "gop888540@gmail.com";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public boolean sendOtpEmail(String toEmail, String otpCode) {
        System.out.println("[ADHYAY 2FA] 📬 Dispatching OTP to " + toEmail + ": " + otpCode);

        if (apiKey == null || apiKey.trim().isEmpty()) {
            System.out.println("[ADHYAY 2FA] ⚠️ No EMAIL_API_KEY configured.");
            return false;
        }

        try {
            if ("brevo".equalsIgnoreCase(provider)) {
                return sendViaBrevo(toEmail, otpCode);
            } else {
                return sendViaResend(toEmail, otpCode);
            }
        } catch (Exception e) {
            System.err.println("[ADHYAY 2FA] ❌ Error dispatching email via " + provider + ": " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    private boolean sendViaBrevo(String toEmail, String otpCode) throws Exception {
        String jsonBody = buildEmailJson(fromName, fromAddress, toEmail, otpCode);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                .header("Content-Type", "application/json")
                .header("accept", "application/json")
                .header("User-Agent", "ADHYAY-Platform/1.0")
                .header("api-key", apiKey.trim())
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            System.out.println("[ADHYAY 2FA] ✅ Successfully dispatched real email via Brevo to " + toEmail);
            return true;
        } else {
            System.err.println("[ADHYAY 2FA] ⚠️ Brevo API returned HTTP " + response.statusCode() + ": " + response.body());
            return false;
        }
    }

    private boolean sendViaResend(String toEmail, String otpCode) throws Exception {
        // Try sending to the requested college address first
        boolean success = executeResendRequest(toEmail, otpCode);

        if (!success && !toEmail.equalsIgnoreCase(resendSandboxEmail)) {
            System.out.println("[ADHYAY 2FA] 🔄 Resend Sandbox active: Forwarding OTP directly to verified owner inbox: " + resendSandboxEmail);
            success = executeResendRequest(resendSandboxEmail, otpCode);
        }

        return success;
    }

    private boolean executeResendRequest(String recipient, String otpCode) throws Exception {
        String htmlContent = """
            <div style='font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px; background: #F6F4ED;'>
              <div style='background: #0D3E36; color: #fff; padding: 18px 24px; border-radius: 8px; margin-bottom: 20px;'>
                <h2 style='margin: 0; font-size: 20px;'>🏛️ Walchand College of Engineering</h2>
                <p style='margin: 4px 0 0; font-size: 13px; opacity: 0.8;'>ADHYAY Lecture &amp; Learning Platform</p>
              </div>
              <h3 style='color: #111827; font-size: 18px;'>Two-Step Verification Passcode</h3>
              <p style='color: #4B5563; font-size: 14px; line-height: 1.5;'>
                A sign-in or account creation request was initiated for your college account. Use the 6-digit verification code below to complete authentication:
              </p>
              <div style='text-align: center; margin: 28px 0;'>
                <span style='display: inline-block; background: #0D3E36; color: #F4A526; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 14px 28px; border-radius: 8px; font-family: monospace;'>%s</span>
              </div>
              <p style='color: #6B7280; font-size: 13px;'>This code is valid for <strong>5 minutes</strong>. If you did not request this, please disregard this email.</p>
              <hr style='border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;'>
              <p style='font-size: 11px; color: #9CA3AF; margin: 0;'>Protected by WCE Campus Security &bull; Official Institutional Access</p>
            </div>
            """.formatted(otpCode);

        // Escape for JSON string
        String escapedHtml = htmlContent.replace("\"", "\\\"").replace("\n", "");

        String jsonBody = """
            {
              "from": "ADHYAY <%s>",
              "to": ["%s"],
              "subject": "ADHYAY | WCE 2-Step Verification Code: %s",
              "html": "%s"
            }
            """.formatted(fromAddress, recipient, otpCode, escapedHtml);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/emails"))
                .header("Content-Type", "application/json")
                .header("User-Agent", "ADHYAY-Platform/1.0")
                .header("Authorization", "Bearer " + apiKey.trim())
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            System.out.println("[ADHYAY 2FA] 🚀 Real email successfully delivered via Resend to: " + recipient);
            return true;
        } else {
            System.err.println("[ADHYAY 2FA] ⚠️ Resend response HTTP " + response.statusCode() + " for " + recipient + ": " + response.body());
            return false;
        }
    }

    @Async
    public void sendNotificationEmail(String toEmail, String subject, String title, String message, String actionLink) {
        if (apiKey == null || apiKey.trim().isEmpty() || toEmail == null || toEmail.isBlank()) {
            return;
        }

        try {
            String htmlContent = """
                <div style='font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px; background: #F8FAFC;'>
                  <div style='background: #0D3E36; color: #fff; padding: 18px 24px; border-radius: 8px; margin-bottom: 20px;'>
                    <h2 style='margin: 0; font-size: 20px;'>🏛️ Walchand College of Engineering</h2>
                    <p style='margin: 4px 0 0; font-size: 13px; opacity: 0.85;'>ADHYAY Learning Platform Alert</p>
                  </div>
                  <h3 style='color: #0F172A; font-size: 18px; margin-top: 0;'>%s</h3>
                  <p style='color: #334155; font-size: 14.5px; line-height: 1.6;'>%s</p>
                  <div style='margin: 24px 0; text-align: center;'>
                    <a href='%s' style='background: #0D3E36; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; display: inline-block;'>View in ADHYAY &rarr;</a>
                  </div>
                  <hr style='border: none; border-top: 1px solid #CBD5E1; margin: 24px 0;'>
                  <p style='font-size: 11px; color: #94A3B8; margin: 0;'>WCE Academic Notification &bull; Walchand College of Engineering, Sangli</p>
                </div>
                """.formatted(title, message, actionLink != null ? actionLink : "http://localhost:3000/student-dashboard.html");

            String escapedHtml = htmlContent.replace("\"", "\\\"").replace("\n", "");
            String targetEmail = toEmail;

            // In Resend sandbox mode, if target is not the verified sandbox address, log and try
            String jsonBody = """
                {
                  "from": "ADHYAY <%s>",
                  "to": ["%s"],
                  "subject": "%s",
                  "html": "%s"
                }
                """.formatted(fromAddress, targetEmail, subject, escapedHtml);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey.trim())
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                System.out.println("[ADHYAY Notification] 🚀 Email delivered to " + targetEmail + ": " + subject);
            } else {
                System.out.println("[ADHYAY Notification] ⚠️ Note on email delivery (" + response.statusCode() + "): " + response.body());
            }
        } catch (Exception e) {
            System.err.println("[ADHYAY Notification] ⚠️ Async email error: " + e.getMessage());
        }
    }

    private String buildEmailJson(String fromName, String fromAddress, String toEmail, String otpCode) {
        return """
            {
              "sender": {"name": "%s", "email": "%s"},
              "to": [{"email": "%s"}],
              "subject": "ADHYAY | WCE 2-Step Verification Code: %s",
              "htmlContent": "<p>Your ADHYAY OTP code is <b>%s</b></p>"
            }
            """.formatted(fromName, fromAddress, toEmail, otpCode, otpCode);
    }
}
