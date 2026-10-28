package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.ActivityLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ActivityLogRepository extends MongoRepository<ActivityLog, String> {
    List<ActivityLog> findTop50ByOrderByTimestampDesc();
}
