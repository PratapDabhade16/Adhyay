package com.adhyay.adhyay_backend.service;

import com.adhyay.adhyay_backend.config.GroqProperties;
import com.adhyay.adhyay_backend.dto.WhisperResponse;
import com.adhyay.adhyay_backend.dto.WhisperSegment;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.io.File;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class WhisperClient {

    private static final Logger log = LoggerFactory.getLogger(WhisperClient.class);
    private static final int MAX_RETRIES = 3;

    private final GroqProperties groqProperties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public WhisperClient(GroqProperties groqProperties, ObjectMapper objectMapper) {
        this.groqProperties = groqProperties;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(30));
        requestFactory.setReadTimeout(Duration.ofMinutes(5));

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .baseUrl(groqProperties.getBaseUrl())
                .build();
    }

    /**
     * Transcribes an audio MP3 file using Groq Whisper API.
     * Retries up to 3 times on HTTP 429 (Too Many Requests) or 5xx server errors with backoff.
     */
    public WhisperResponse transcribeAudio(File audioFile, double timeOffsetSeconds) {
        String apiKey = groqProperties.getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("GROQ_API_KEY is not configured. Please set the GROQ_API_KEY environment variable.");
        }

        String model = groqProperties.getModels().getWhisper();
        log.info("Sending audio to Groq Whisper API [model={}, size={} bytes, offset={}s]",
                model, audioFile.length(), timeOffsetSeconds);

        int attempt = 0;
        while (attempt <= MAX_RETRIES) {
            try {
                MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
                body.add("file", new FileSystemResource(audioFile));
                body.add("model", model);
                body.add("response_format", "verbose_json");

                String rawJson = restClient.post()
                        .uri("/audio/transcriptions")
                        .header("Authorization", "Bearer " + apiKey)
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(body)
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, (req, resp) -> {
                            int statusCode = resp.getStatusCode().value();
                            String retryAfterHeader = resp.getHeaders().getFirst("Retry-After");
                            String errorBody = new String(resp.getBody().readAllBytes());
                            log.warn("Groq Whisper API returned HTTP {}: {}", statusCode, errorBody);

                            if (statusCode == 429) {
                                throw new HttpClientErrorException(
                                        HttpStatusCode.valueOf(429),
                                        "Rate limit exceeded (Retry-After: " + retryAfterHeader + "): " + errorBody
                                );
                            }
                            if (statusCode >= 500) {
                                throw new HttpServerErrorException(
                                        HttpStatusCode.valueOf(statusCode),
                                        "Groq Server Error: " + errorBody
                                );
                            }
                            throw new RuntimeException("Groq Whisper API Error " + statusCode + ": " + errorBody);
                        })
                        .body(String.class);

                WhisperResponse response = objectMapper.readValue(rawJson, WhisperResponse.class);

                // Offset segment timestamps if this is part of a split audio stream
                if (timeOffsetSeconds > 0 && response != null && response.segments() != null) {
                    List<WhisperSegment> adjustedSegments = new ArrayList<>();
                    for (WhisperSegment seg : response.segments()) {
                        adjustedSegments.add(new WhisperSegment(
                                seg.start() + timeOffsetSeconds,
                                seg.end() + timeOffsetSeconds,
                                seg.text()
                        ));
                    }
                    Double adjustedDuration = response.duration() != null ? response.duration() + timeOffsetSeconds : null;
                    return new WhisperResponse(response.text(), adjustedDuration, adjustedSegments);
                }

                return response;

            } catch (HttpClientErrorException.TooManyRequests e) {
                attempt++;
                if (attempt > MAX_RETRIES) {
                    throw new RuntimeException("Groq Whisper API rate limit reached after " + MAX_RETRIES + " retries: " + e.getMessage(), e);
                }
                long sleepMs = parseRetryAfterOrComputeBackoff(e.getMessage(), attempt);
                log.warn("Groq Whisper 429 received. Backing off for {} ms (attempt {}/{})", sleepMs, attempt, MAX_RETRIES);
                sleep(sleepMs);

            } catch (HttpServerErrorException e) {
                attempt++;
                if (attempt > MAX_RETRIES) {
                    throw new RuntimeException("Groq Whisper API failed with 5xx error after " + MAX_RETRIES + " retries: " + e.getMessage(), e);
                }
                long sleepMs = (long) Math.pow(2, attempt) * 1500L;
                log.warn("Groq Whisper 5xx received. Retrying in {} ms (attempt {}/{})", sleepMs, attempt, MAX_RETRIES);
                sleep(sleepMs);

            } catch (Exception e) {
                if (e.getMessage() != null && e.getMessage().contains("429")) {
                    attempt++;
                    if (attempt > MAX_RETRIES) throw new RuntimeException("Groq Whisper 429 exceeded max retries: " + e.getMessage(), e);
                    long sleepMs = (long) Math.pow(2, attempt) * 2000L;
                    log.warn("Groq rate limit encountered. Retrying in {} ms", sleepMs);
                    sleep(sleepMs);
                } else {
                    log.error("Failed to transcribe audio with Groq Whisper: {}", e.getMessage(), e);
                    throw new RuntimeException("Whisper transcription failed: " + e.getMessage(), e);
                }
            }
        }

        throw new RuntimeException("Groq Whisper transcription failed after all retry attempts.");
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

