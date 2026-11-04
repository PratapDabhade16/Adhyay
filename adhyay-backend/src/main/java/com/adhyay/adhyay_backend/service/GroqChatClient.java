package com.adhyay.adhyay_backend.service;

import com.adhyay.adhyay_backend.config.GroqProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GroqChatClient {

    private static final Logger log = LoggerFactory.getLogger(GroqChatClient.class);
    private static final int MAX_RETRIES = 3;

    private final GroqProperties groqProperties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public GroqChatClient(GroqProperties groqProperties, ObjectMapper objectMapper) {
        this.groqProperties = groqProperties;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(15));
        requestFactory.setReadTimeout(Duration.ofSeconds(60));

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .baseUrl(groqProperties.getBaseUrl())
                .build();
    }

    /**
     * Expands a student question into 5-8 keywords/synonyms/Hinglish terms
     * using the fast and lightweight llama-3.1-8b-instant model.
     */
    public List<String> expandQuery(String question) {
        String model = groqProperties.getModels().getQueryExpansion();
        String systemPrompt = "You are a search query expansion assistant for college engineering lectures at Walchand College of Engineering (often taught in English and Hinglish). " +
                "Given a student's question, output ONLY 5 to 8 comma-separated search keywords, technical terms, synonyms, or transliterated Hinglish words relevant to the concept. " +
                "Do not include quotes, numbering, introduction, or explanations. Just comma-separated words.";

        try {
            String rawAnswer = callChatCompletion(model, systemPrompt, question, 0.1);
            if (rawAnswer == null || rawAnswer.isBlank()) {
                return List.of();
            }

            List<String> keywords = new ArrayList<>();
            for (String part : rawAnswer.split(",")) {
                String clean = part.trim().toLowerCase().replaceAll("[^a-zA-Z0-9\\s]", "");
                if (!clean.isBlank() && clean.length() > 2) {
                    keywords.add(clean);
                }
            }
            log.info("Expanded query '{}' into keywords: {}", question, keywords);
            return keywords;

        } catch (Exception e) {
            log.warn("Query expansion failed, falling back to original query tokens: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Generates a lecture-grounded answer using llama-3.3-70b-versatile.
     */
    public String answerLectureQuestion(String contextChunksText, String question) {
        String model = groqProperties.getModels().getChat();

        String systemPrompt = """
                You are ADHYAY AI, the official lecture assistant for Walchand College of Engineering (WCE).
                Your sole purpose is to answer the student's question accurately based STRICTLY on the provided lecture transcript context.

                INSTRUCTIONS:
                1. Answer ONLY using the facts and information directly mentioned in the context. Do NOT fabricate or assume anything outside the lecture.
                2. If the context does not contain the answer, you MUST say exactly: "This was not covered in this lecture." Do not provide external answers.
                3. Keep your explanation structured, crisp, and clear in simple English. If the instructor used Hinglish technical phrases (e.g., 'array ko partition karte hai', 'pointer ko increment karo'), preserve the technical intuition naturally.
                4. For each key point or concept explained, explicitly cite the lecture timestamp in the format [MM:SS] (e.g., [08:14], [12:40]) based on the chunk start time it was mentioned in.
                5. Do NOT include markdown image tags or fabricate URLs.
                """;

        String userPrompt = "LECTURE TRANSCRIPT CONTEXT:\n" +
                contextChunksText +
                "\n\nSTUDENT QUESTION:\n" +
                question;

        return callChatCompletion(model, systemPrompt, userPrompt, 0.2);
    }

    private String callChatCompletion(String model, String systemPrompt, String userPrompt, double temperature) {
        String apiKey = groqProperties.getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("GROQ_API_KEY is not configured in environment variables or application.properties.");
        }

        Map<String, Object> requestPayload = new HashMap<>();
        requestPayload.put("model", model);
        requestPayload.put("temperature", temperature);

        List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        );
        requestPayload.put("messages", messages);

        int attempt = 0;
        while (attempt <= MAX_RETRIES) {
            try {
                String rawJson = restClient.post()
                        .uri("/chat/completions")
                        .header("Authorization", "Bearer " + apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestPayload)
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, (req, resp) -> {
                            int statusCode = resp.getStatusCode().value();
                            String retryAfterHeader = resp.getHeaders().getFirst("Retry-After");
                            String errorBody = new String(resp.getBody().readAllBytes());

                            if (statusCode == 429) {
                                throw new HttpClientErrorException(
                                        HttpStatusCode.valueOf(429),
                                        "Groq Chat Rate Limit (Retry-After: " + retryAfterHeader + "): " + errorBody
                                );
                            }
                            if (statusCode >= 500) {
                                throw new HttpServerErrorException(
                                        HttpStatusCode.valueOf(statusCode),
                                        "Groq Chat 5xx Server Error: " + errorBody
                                );
                            }
                            throw new RuntimeException("Groq Chat Error " + statusCode + ": " + errorBody);
                        })
                        .body(String.class);

                JsonNode root = objectMapper.readTree(rawJson);
                JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
                if (contentNode.isMissingNode() || contentNode.isNull()) {
                    throw new RuntimeException("Unexpected Groq response structure: " + rawJson);
                }
                return contentNode.asText();

            } catch (HttpClientErrorException.TooManyRequests e) {
                attempt++;
                if (attempt > MAX_RETRIES) {
                    throw new RuntimeException("Groq Chat API rate limit reached after " + MAX_RETRIES + " retries: " + e.getMessage(), e);
                }
                long sleepMs = parseRetryAfterOrComputeBackoff(e.getMessage(), attempt);
                log.warn("Groq Chat 429 received. Backing off for {} ms (attempt {}/{})", sleepMs, attempt, MAX_RETRIES);
                sleep(sleepMs);

            } catch (HttpServerErrorException e) {
                attempt++;
                if (attempt > MAX_RETRIES) {
                    throw new RuntimeException("Groq Chat API failed with 5xx error after " + MAX_RETRIES + " retries: " + e.getMessage(), e);
                }
                long sleepMs = (long) Math.pow(2, attempt) * 1500L;
                log.warn("Groq Chat 5xx received. Retrying in {} ms (attempt {}/{})", sleepMs, attempt, MAX_RETRIES);
                sleep(sleepMs);

            } catch (Exception e) {
                if (e.getMessage() != null && e.getMessage().contains("429")) {
                    attempt++;
                    if (attempt > MAX_RETRIES) throw new RuntimeException("Groq Chat 429 exceeded max retries: " + e.getMessage(), e);
                    long sleepMs = (long) Math.pow(2, attempt) * 2000L;
                    log.warn("Groq rate limit encountered. Retrying in {} ms", sleepMs);
                    sleep(sleepMs);
                } else {
                    log.error("Failed to call Groq Chat API: {}", e.getMessage(), e);
                    throw new RuntimeException("Groq Chat call failed: " + e.getMessage(), e);
                }
            }
        }

        throw new RuntimeException("Groq Chat failed after max retries.");
    }

    private long parseRetryAfterOrComputeBackoff(String message, int attempt) {
        try {
            if (message != null && message.contains("Retry-After: ")) {
                String sub = message.substring(message.indexOf("Retry-After: ") + 13);
                String val = sub.split("[\\):,]")[0].trim();
                double seconds = Double.parseDouble(val);
                return (long) (seconds * 1000L) + 500L;
            }
        } catch (Exception ignored) {}
        return (long) Math.pow(2, attempt) * 2000L;
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}

