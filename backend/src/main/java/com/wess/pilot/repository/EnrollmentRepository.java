package com.wess.pilot.repository;

import com.wess.pilot.domain.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    List<Enrollment> findByYearAndSemester(Integer year, String semester);

    List<Enrollment> findByStudentId(Long studentId);
}
