package com.wess.pilot.repository;

import com.wess.pilot.domain.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    Optional<Feedback> findByJournalId(Long journalId);
}
