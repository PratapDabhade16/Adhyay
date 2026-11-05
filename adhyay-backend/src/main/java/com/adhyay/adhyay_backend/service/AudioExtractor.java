package com.adhyay.adhyay_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class AudioExtractor {

    private static final Logger log = LoggerFactory.getLogger(AudioExtractor.class);
    private static final long MAX_FILE_SIZE_BYTES = 24L * 1024L * 1024L; // 24MB Groq limit
    private static final int SEGMENT_TIME_SECONDS = 600; // 10 minutes

    @Value("${ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    public record AudioPart(File file, int partIndex, double timeOffsetSeconds) {}

    public record ExtractionResult(List<AudioPart> parts, List<File> tempFilesToClean) {}

    /**
     * Extracts mono 16kHz 32kbps MP3 audio from a video file or video URL.
     * Splits into 10-minute segments if the file exceeds 24MB.
     */
    public ExtractionResult extractAudio(File localVideoFile, String videoUrl) throws IOException, InterruptedException {
        List<File> tempFiles = new ArrayList<>();
        File sourceVideo = localVideoFile;

        // If local video doesn't exist, download from videoUrl
        if (sourceVideo == null || !sourceVideo.exists() || sourceVideo.length() == 0) {
            if (videoUrl == null || videoUrl.isBlank()) {
                throw new IllegalArgumentException("Neither local video file nor videoUrl was provided for audio extraction.");
            }
            log.info("Downloading video for transcription from: {}", videoUrl);
            sourceVideo = downloadVideo(videoUrl);
            tempFiles.add(sourceVideo);
        }

        File mainMp3 = File.createTempFile("adhyay-audio-" + UUID.randomUUID() + "-", ".mp3");
        tempFiles.add(mainMp3);

        log.info("Running FFmpeg audio extraction: {} -> {}", sourceVideo.getName(), mainMp3.getName());

        // Command: ffmpeg -y -i in.mp4 -vn -ac 1 -ar 16000 -b:a 32k out.mp3
        List<String> command = List.of(
                getEffectiveFfmpegPath(),
                "-y",
                "-i", sourceVideo.getAbsolutePath(),
                "-vn",
                "-ac", "1",
                "-ar", "16000",
                "-b:a", "32k",
                mainMp3.getAbsolutePath()
        );

        runProcess(command, "Audio Extraction");

        if (!mainMp3.exists() || mainMp3.length() == 0) {
            throw new IOException("FFmpeg audio extraction produced an empty or missing output file.");
        }

        long mp3Size = mainMp3.length();
        log.info("Audio extraction complete. Size: {} bytes (~{} MB)", mp3Size, mp3Size / (1024 * 1024));

        List<AudioPart> parts = new ArrayList<>();

        // If MP3 is <= 24MB, return as a single part
        if (mp3Size <= MAX_FILE_SIZE_BYTES) {
            parts.add(new AudioPart(mainMp3, 0, 0.0));
            return new ExtractionResult(parts, tempFiles);
        }

        // If > 24MB, split into 10-minute segments
        log.info("Audio size exceeds 24MB. Splitting into 10-minute segments with FFmpeg...");
        File splitDir = Files.createTempDirectory("adhyay-audio-split-" + UUID.randomUUID()).toFile();
        tempFiles.add(splitDir);

        File segmentPattern = new File(splitDir, "part_%03d.mp3");

        // Command: ffmpeg -y -i out.mp3 -f segment -segment_time 600 -c copy part_%03d.mp3
        List<String> splitCommand = List.of(
                getEffectiveFfmpegPath(),
                "-y",
                "-i", mainMp3.getAbsolutePath(),
                "-f", "segment",
                "-segment_time", String.valueOf(SEGMENT_TIME_SECONDS),
                "-c", "copy",
                segmentPattern.getAbsolutePath()
        );

        runProcess(splitCommand, "Audio Segmentation");

        File[] segmentFiles = splitDir.listFiles((dir, name) -> name.startsWith("part_") && name.endsWith(".mp3"));
        if (segmentFiles == null || segmentFiles.length == 0) {
            throw new IOException("FFmpeg segmentation failed: No audio parts were created.");
        }

        List<File> sortedSegments = new ArrayList<>(List.of(segmentFiles));
        sortedSegments.sort(Comparator.comparing(File::getName));

        for (int i = 0; i < sortedSegments.size(); i++) {
            File partFile = sortedSegments.get(i);
            tempFiles.add(partFile);
            double offset = (double) i * SEGMENT_TIME_SECONDS;
            parts.add(new AudioPart(partFile, i, offset));
            log.info("Created audio part {}: {} (offset {}s)", i, partFile.getName(), offset);
        }

        return new ExtractionResult(parts, tempFiles);
    }

    private File downloadVideo(String videoUrl) throws IOException, InterruptedException {
        File tempVideo = File.createTempFile("adhyay-download-" + UUID.randomUUID() + "-", ".mp4");
        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .connectTimeout(Duration.ofSeconds(20))
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(videoUrl))
                .timeout(Duration.ofMinutes(10))
                .GET()
                .build();

        HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() >= 400) {
            throw new IOException("Failed to download video from URL: HTTP " + response.statusCode());
        }

        try (InputStream in = response.body()) {
            Files.copy(in, tempVideo.toPath(), StandardCopyOption.REPLACE_EXISTING);
        }

        return tempVideo;
    }

    private void runProcess(List<String> command, String operationName) throws IOException, InterruptedException {
        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.redirectErrorStream(true);

        Process process;
        try {
            process = processBuilder.start();
        } catch (IOException e) {
            throw new IOException("Could not execute FFmpeg at path '" + getEffectiveFfmpegPath() + "'. " +
                    "Please ensure FFmpeg is installed and added to PATH (or configure ffmpeg.path in application.properties). Error: " + e.getMessage(), e);
        }

        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append(System.lineSeparator());
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            log.error("FFmpeg [{}] failed with exit code {}. Output:\n{}", operationName, exitCode, output);
            throw new IOException("FFmpeg " + operationName + " failed with exit code " + exitCode + ". Details: " + output);
        }
    }

    /**
     * Deletes temporary files and directories safely.
     */
    public void cleanupTempFiles(List<File> files) {
        if (files == null) return;
        for (File file : files) {
            if (file != null && file.exists()) {
                try {
                    if (file.isDirectory()) {
                        File[] children = file.listFiles();
                        if (children != null) {
                            for (File child : children) {
                                child.delete();
                            }
                        }
                    }
                    boolean deleted = file.delete();
                    if (!deleted) {
                        file.deleteOnExit();
                    }
                } catch (Exception e) {
                    log.warn("Failed to delete temp file: {}", file.getAbsolutePath(), e);
                }
            }
        }
    }
}

