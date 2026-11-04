package com.adhyay.adhyay_backend.service;

import com.adhyay.adhyay_backend.model.TranscriptChunk;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChunkRetriever {

    private static final double K1 = 1.2;
    private static final double B = 0.75;

    // Common English stopwords to filter out noise
    private static final Set<String> STOPWORDS = Set.of(
            "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
            "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
            "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
            "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
            "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself",
            "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is",
            "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no",
            "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves",
            "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
            "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
            "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those",
            "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're",
            "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while",
            "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll",
            "you're", "you've", "your", "yours", "yourself", "yourselves"
    );

    /**
     * Scores all lecture chunks using BM25 against the combined terms of
     * the original question and the expanded keywords. Returns the top 5 chunks.
     */
    public List<TranscriptChunk> retrieveTopChunks(List<TranscriptChunk> allChunks, String originalQuestion, List<String> expandedKeywords) {
        if (allChunks == null || allChunks.isEmpty()) {
            return List.of();
        }

        if (allChunks.size() <= 5) {
            return new ArrayList<>(allChunks);
        }

        // 1. Tokenize query (original question + expanded keywords)
        List<String> queryTokens = new ArrayList<>(tokenize(originalQuestion));
        if (expandedKeywords != null) {
            for (String kw : expandedKeywords) {
                queryTokens.addAll(tokenize(kw));
            }
        }

        if (queryTokens.isEmpty()) {
            // Fallback: return first 5 chronological chunks
            return allChunks.stream().limit(5).collect(Collectors.toList());
        }

        // Count query term frequencies
        Map<String, Integer> queryTermWeights = new HashMap<>();
        for (String token : queryTokens) {
            queryTermWeights.put(token, queryTermWeights.getOrDefault(token, 0) + 1);
        }

        // 2. Pre-tokenize all chunks and calculate statistics
        int N = allChunks.size();
        List<List<String>> chunkTokensList = new ArrayList<>(N);
        Map<String, Integer> documentFrequency = new HashMap<>();
        double totalLength = 0;

        for (TranscriptChunk chunk : allChunks) {
            List<String> tokens = tokenize(chunk.getText());
            chunkTokensList.add(tokens);
            totalLength += tokens.size();

            Set<String> uniqueTokens = new HashSet<>(tokens);
            for (String term : uniqueTokens) {
                documentFrequency.put(term, documentFrequency.getOrDefault(term, 0) + 1);
            }
        }

        double avgdl = totalLength / (double) N;
        if (avgdl == 0) avgdl = 1.0;

        // 3. Score each chunk using BM25
        record ScoredChunk(TranscriptChunk chunk, double score) {}
        List<ScoredChunk> scoredList = new ArrayList<>(N);

        for (int i = 0; i < N; i++) {
            TranscriptChunk chunk = allChunks.get(i);
            List<String> tokens = chunkTokensList.get(i);
            int docLength = tokens.size();

            Map<String, Integer> termFreqs = new HashMap<>();
            for (String token : tokens) {
                termFreqs.put(token, termFreqs.getOrDefault(token, 0) + 1);
            }

            double score = 0.0;
            for (Map.Entry<String, Integer> entry : queryTermWeights.entrySet()) {
                String term = entry.getKey();
                int qf = entry.getValue();

                int tf = termFreqs.getOrDefault(term, 0);
                if (tf == 0) continue;

                int df = documentFrequency.getOrDefault(term, 0);

                // Smoothed Robertson-Spärck Jones IDF:
                double idf = Math.log(1.0 + (N - df + 0.5) / (df + 0.5));

                // BM25 term frequency saturation
                double numerator = tf * (K1 + 1.0);
                double denominator = tf + K1 * (1.0 - B + B * ((double) docLength / avgdl));

                score += idf * (numerator / denominator) * qf;
            }

            scoredList.add(new ScoredChunk(chunk, score));
        }

        // Sort descending by BM25 score
        scoredList.sort((a, b) -> Double.compare(b.score(), a.score()));

        // If top score is 0.0 (no exact matches), fallback to first 5 chunks
        if (scoredList.get(0).score() <= 0.0) {
            return allChunks.stream().limit(5).collect(Collectors.toList());
        }

        return scoredList.stream()
                .limit(5)
                .map(ScoredChunk::chunk)
                .collect(Collectors.toList());
    }

    /**
     * Splits text into lowercase tokens, removes punctuation, symbols, and English stopwords.
     */
    public List<String> tokenize(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }

        String[] rawTokens = text.toLowerCase().split("[^a-zA-Z0-9]+");
        List<String> result = new ArrayList<>();

        for (String raw : rawTokens) {
            String token = raw.trim();
            if (token.length() >= 2 && !STOPWORDS.contains(token)) {
                result.add(token);
            }
        }
        return result;
    }
}

