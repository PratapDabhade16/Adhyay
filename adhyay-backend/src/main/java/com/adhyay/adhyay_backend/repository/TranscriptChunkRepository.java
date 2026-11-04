package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.TranscriptChunk;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TranscriptChunkRepository extends MongoRepository<TranscriptChunk, String> {

    List<TranscriptChunk> findByLectureIdOrderByStartTimeAsc(String lectureId);

    void deleteByLectureId(String lectureId);
}

