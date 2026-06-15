package com.wess.pilot.repository;

import com.wess.pilot.domain.Journal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JournalRepository extends JpaRepository<Journal, Long> {

    List<Journal> findByEnrollmentId(Long enrollmentId);

    Optional<Journal> findByEnrollmentIdAndWeek(Long enrollmentId, Integer week);

    List<Journal> findByEnrollmentIdIn(List<Long> enrollmentIds);
}
