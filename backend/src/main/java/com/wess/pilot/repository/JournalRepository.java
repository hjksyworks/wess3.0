package com.wess.pilot.repository;

import com.wess.pilot.domain.Journal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface JournalRepository extends JpaRepository<Journal, Long> {

    List<Journal> findByEnrollmentId(Long enrollmentId);

    List<Journal> findByStatusIn(java.util.Collection<com.wess.pilot.domain.JournalStatus> statuses);

    Optional<Journal> findByEnrollmentIdAndWeek(Long enrollmentId, Integer week);

    List<Journal> findByEnrollmentIdIn(List<Long> enrollmentIds);

    @Query("select j.enrollment.student.id from Journal j where j.id = :id")
    java.util.Optional<Long> findOwnerStudentId(@Param("id") Long id);
}
