package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.ActivityLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ActivityLogRepository extends MongoRepository<ActivityLog, String> {
    List<ActivityLog> findTop50ByOrderByTimestampDesc();
    List<ActivityLog> findAllByOrderByTimestampDesc();
    List<ActivityLog> findByTimestampBetweenOrderByTimestampDesc(Instant start, Instant end);
    List<ActivityLog> findByPerformedByContainingIgnoreCaseOrderByTimestampDesc(String performedBy);
}
