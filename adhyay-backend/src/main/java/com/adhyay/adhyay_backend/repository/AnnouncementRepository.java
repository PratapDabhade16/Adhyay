package com.adhyay.adhyay_backend.repository;

import com.adhyay.adhyay_backend.model.Announcement;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementRepository extends MongoRepository<Announcement, String> {

    List<Announcement> findBySubjectNameOrSubjectNameEqualsIgnoreCaseOrSubjectNameEquals(String subjectName, String subjectName2, String all);

    List<Announcement> findByBranchOrBranchEqualsIgnoreCaseOrBranchEquals(String branch, String branch2, String all);

    List<Announcement> findAllByOrderByCreatedAtDesc();
}

