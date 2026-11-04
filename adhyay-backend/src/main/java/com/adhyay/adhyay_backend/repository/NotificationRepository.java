package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    List<Notification> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    List<Notification> findByUserEmailOrUserIdOrderByCreatedAtDesc(String userEmail, String userId);

    long countByUserEmailAndReadFalse(String userEmail);

    long countByUserIdAndReadFalse(String userId);

    void deleteAllByUserEmail(String userEmail);
}

