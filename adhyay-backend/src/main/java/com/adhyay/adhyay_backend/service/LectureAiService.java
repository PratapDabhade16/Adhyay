package com.adhyay.adhyay_backend.service;

import com.adhyay.adhyay_backend.dto.*;
import com.adhyay.adhyay_backend.model.AiQuestion;
import com.adhyay.adhyay_backend.model.Lecture;
import com.adhyay.adhyay_backend.model.TranscriptChunk;
import com.adhyay.adhyay_backend.repository.AiQuestionRepository;
import com.adhyay.adhyay_backend.repository.LectureRepository;
import com.adhyay.adhyay_backend.repository.TranscriptChunkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.*;

@Service
public class LectureAiService {

    private static final Logger log = LoggerFactory.getLogger(LectureAiService.class);

    private final LectureRepository lectureRepository;
    private final TranscriptChunkRepository chunkRepository;
    private final AudioExtractor audioExtractor;
    private final WhisperClient whisperClient;
    private final GroqChatClient groqChatClient;
    private final ChunkRetriever chunkRetriever;
    private final RateLimiterService rateLimiterService;
    private final AiQuestionRepository aiQuestionRepository;

    public LectureAiService(
            LectureRepository lectureRepository,
            TranscriptChunkRepository chunkRepository,
            AudioExtractor audioExtractor,
            WhisperClient whisperClient,
            GroqChatClient groqChatClient,
            ChunkRetriever chunkRetriever,
            RateLimiterService rateLimiterService,
            AiQuestionRepository aiQuestionRepository) {
        this.lectureRepository = lectureRepository;
        this.chunkRepository = chunkRepository;
        this.audioExtractor = audioExtractor;
        this.whisperClient = whisperClient;
        this.groqChatClient = groqChatClient;
        this.chunkRetriever = chunkRetriever;
        this.rateLimiterService = rateLimiterService;
        this.aiQuestionRepository = aiQuestionRepository;
    }

    /**
     * Async pipeline: Extracts audio with FFmpeg, transcribes via Groq Whisper,
     * splits into 45s overlapping chunks, and stores into MongoDB.
     */
    @Async("lectureAiTaskExecutor")
    public void processLectureTranscriptionAsync(String lectureId, File localVideoFile) {
        log.info("Starting asynchronous AI transcription for lectureId: {}", lectureId);

        Lecture lecture = lectureRepository.findById(lectureId).orElse(null);
        if (lecture == null) {
            log.error("Lecture not found for id: {}", lectureId);
            return;
        }

        lecture.setTranscriptStatus("PENDING");
        lecture.setTranscriptError(null);
        lectureRepository.save(lecture);

        List<File> tempFilesToClean = new ArrayList<>();
        if (localVideoFile != null) {
            tempFilesToClean.add(localVideoFile);
        }

        try {
            // Step 1: Audio Extraction via FFmpeg (with 24MB splitting if needed)
            AudioExtractor.ExtractionResult extractionResult = audioExtractor.extractAudio(localVideoFile,
                    lecture.getVideoUrl());
            tempFilesToClean.addAll(extractionResult.tempFilesToClean());

            // Step 2: Transcribe all audio parts via Groq Whisper
            List<WhisperSegment> allSegments = new ArrayList<>();
            StringBuilder fullTranscriptBuilder = new StringBuilder();
            double maxDurationSeconds = 0.0;

            for (AudioExtractor.AudioPart part : extractionResult.parts()) {
                log.info("Transcribing part {} (offset {}s) for lectureId {}", part.partIndex(),
                        part.timeOffsetSeconds(), lectureId);
                WhisperResponse partResponse = whisperClient.transcribeAudio(part.file(), part.timeOffsetSeconds());

                if (partResponse != null) {
                    if (partResponse.text() != null && !partResponse.text().isBlank()) {
                        if (fullTranscriptBuilder.length() > 0)
                            fullTranscriptBuilder.append("\n");
                        fullTranscriptBuilder.append(partResponse.text().trim());
                    }
                    if (partResponse.segments() != null) {
                        allSegments.addAll(partResponse.segments());
                    }
                    if (partResponse.duration() != null) {
                        maxDurationSeconds = Math.max(maxDurationSeconds, partResponse.duration());
                    }
                }
            }

            // Step 3: Chunking into ~45-second chunks with ~10-second overlap
            List<TranscriptChunk> chunks = createOverlappingChunks(
                    lecture.getId(),
                    lecture.getSubject(),
                    lecture.getUnit(),
                    allSegments);

            // Step 4: Persist chunks into MongoDB
            chunkRepository.deleteByLectureId(lectureId);
            if (!chunks.isEmpty()) {
                chunkRepository.saveAll(chunks);
            }

            // Step 5: Mark Lecture as DONE
            lecture.setTranscriptStatus("DONE");
            lecture.setTranscriptError(null);
            lecture.setTranscriptText(fullTranscriptBuilder.toString().trim());
            lecture.setDurationSeconds(maxDurationSeconds);
            lectureRepository.save(lecture);

            log.info("AI transcription SUCCESS for lecture '{}' (id: {}). Total chunks: {}, duration: {}s",
                    lecture.getTitle(), lectureId, chunks.size(), maxDurationSeconds);

        } catch (Exception e) {
            log.error("AI transcription FAILED for lectureId {}: {}", lectureId, e.getMessage(), e);
            lecture.setTranscriptStatus("FAILED");
            lecture.setTranscriptError(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            lectureRepository.save(lecture);

        } finally {
            audioExtractor.cleanupTempFiles(tempFilesToClean);
        }
    }

    /**
     * Groups Whisper segments into ~45-second chunks with ~10-second overlap.
     */
    private List<TranscriptChunk> createOverlappingChunks(String lectureId, String subject, String unit,
            List<WhisperSegment> segments) {
        List<TranscriptChunk> chunks = new ArrayList<>();
        if (segments == null || segments.isEmpty()) {
            return chunks;
        }

        // Sort segments chronologically
        segments.sort(Comparator.comparingDouble(WhisperSegment::start));

        int i = 0;
        while (i < segments.size()) {
            double chunkStart = segments.get(i).start();
            StringBuilder chunkText = new StringBuilder();
            double chunkEnd = chunkStart;
            int j = i;

            while (j < segments.size()) {
                WhisperSegment seg = segments.get(j);
                if (chunkText.length() > 0)
                    chunkText.append(" ");
                chunkText.append(seg.text().trim());
                chunkEnd = Math.max(chunkEnd, seg.end());
                j++;

                // Stop chunk when approx 45 seconds reached
                if (chunkEnd - chunkStart >= 45.0) {
                    break;
                }
            }

            TranscriptChunk chunk = new TranscriptChunk(
                    lectureId,
                    subject != null ? subject : "General",
                    unit != null ? unit : "1",
                    chunkStart,
                    chunkEnd,
                    chunkText.toString().trim());
            chunks.add(chunk);

            if (j >= segments.size()) {
                break;
            }

            // Advance i to achieve ~10s overlap
            int nextI = i + 1;
            double targetOverlapStart = Math.max(chunkStart + 1.0, chunkEnd - 10.0);
            for (int k = i + 1; k < j; k++) {
                if (segments.get(k).start() >= targetOverlapStart) {
                    nextI = k;
                    break;
                }
            }
            i = nextI;
        }

        return chunks;
    }

    /**
     * Answers a student question about a lecture using BM25 retrieval + Groq LLM.
     */
    public AskResponse askQuestion(String lectureId, AskRequest request, String clientIdentifier) {
        String question = request.question();
        if (question == null || question.trim().isBlank()) {
            throw new IllegalArgumentException("Question cannot be empty.");
        }

        // 1. Rate Limiting Check (20 questions / hour)
        String userKey = request.userId() != null && !request.userId().isBlank()
                ? request.userId()
                : (request.userEmail() != null ? request.userEmail() : clientIdentifier);

        if (!rateLimiterService.allowRequest(userKey)) {
            throw new IllegalStateException(
                    "Rate limit exceeded: You have reached the maximum of 20 questions per hour. Please wait a bit before asking again.");
        }

        // 2. Verify Lecture and Transcript Status
        Lecture lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new NoSuchElementException("Lecture not found with id: " + lectureId));

        if (!"DONE".equalsIgnoreCase(lecture.getTranscriptStatus())) {
            if ("PENDING".equalsIgnoreCase(lecture.getTranscriptStatus())) {
                return new AskResponse(
                        "The AI transcript for this lecture is currently being processed. Please try again in 1-2 minutes.",
                        List.of());
            }
            return new AskResponse(
                    "AI transcription is not available for this lecture yet. Please ask your faculty to generate it.",
                    List.of());
        }

        // 3. Fetch all chunks
        List<TranscriptChunk> allChunks = chunkRepository.findByLectureIdOrderByStartTimeAsc(lectureId);
        if (allChunks.isEmpty()) {
            return new AskResponse("No transcript chunks found for this lecture.", List.of());
        }

        // 4. Query expansion via Groq llama-3.1-8b-instant
        List<String> expandedKeywords = groqChatClient.expandQuery(question);

        // 5. BM25 Retrieval of top 5 chunks
        List<TranscriptChunk> topChunks = chunkRetriever.retrieveTopChunks(allChunks, question, expandedKeywords);

        // 6. Build Context for LLM
        StringBuilder contextBuilder = new StringBuilder();
        List<SourceChunkDto> sourceDtos = new ArrayList<>();

        for (TranscriptChunk chunk : topChunks) {
            String formattedTime = formatSeconds(chunk.getStartTime());
            contextBuilder.append(String.format("[Start: %s (%.0fs)] %s\n\n",
                    formattedTime, chunk.getStartTime(), chunk.getText()));

            sourceDtos.add(new SourceChunkDto(
                    chunk.getStartTime(),
                    chunk.getEndTime(),
                    formattedTime,
                    chunk.getText()));
        }

        // 7. Generate Answer via Groq llama-3.3-70b-versatile
        String answer = groqChatClient.answerLectureQuestion(contextBuilder.toString(), question);

        // 8. Persist AI question for Phase 4 faculty analytics
        try {
            aiQuestionRepository.save(new AiQuestion(lectureId, lecture.getTitle(), question, request.userEmail()));
        } catch (Exception e) {
            log.warn("Failed to persist AI question for analytics: {}", e.getMessage());
        }

        return new AskResponse(answer, sourceDtos);
    }

    public TranscriptStatusResponse getTranscriptStatus(String lectureId) {
        Lecture lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new NoSuchElementException("Lecture not found: " + lectureId));

        return new TranscriptStatusResponse(
                lecture.getId(),
                lecture.getTranscriptStatus(),
                lecture.getTranscriptError(),
                lecture.getDurationSeconds());
    }

    public TranscriptResponse getFullTranscript(String lectureId) {
        Lecture lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new NoSuchElementException("Lecture not found: " + lectureId));

        List<TranscriptChunk> chunks = chunkRepository.findByLectureIdOrderByStartTimeAsc(lectureId);
        List<SourceChunkDto> dtos = new ArrayList<>();
        for (TranscriptChunk c : chunks) {
            dtos.add(
                    new SourceChunkDto(c.getStartTime(), c.getEndTime(), formatSeconds(c.getStartTime()), c.getText()));
        }

        return new TranscriptResponse(
                lecture.getId(),
                lecture.getTranscriptStatus(),
                lecture.getTranscriptText(),
                dtos);
    }

    public void retryTranscription(String lectureId) {
        Lecture lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new NoSuchElementException("Lecture not found: " + lectureId));

        if (lecture.getVideoUrl() == null || lecture.getVideoUrl().isBlank()) {
            throw new IllegalStateException("Cannot transcribe lecture: No video URL is associated with this lecture.");
        }

        // Trigger async extraction using Cloudinary videoUrl
        processLectureTranscriptionAsync(lectureId, null);
    }

    public static String formatSeconds(double totalSeconds) {
        long s = Math.round(totalSeconds);
        long hours = s / 3600;
        long minutes = (s % 3600) / 60;
        long seconds = s % 60;

        if (hours > 0) {
            return String.format("%d:%02d:%02d", hours, minutes, seconds);
        }
        return String.format("%02d:%02d", minutes, seconds);
    }
}
