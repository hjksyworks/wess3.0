package com.wess.pilot.repository;

import com.wess.pilot.domain.FormTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FormTemplateRepository extends JpaRepository<FormTemplate, Long> {

    List<FormTemplate> findByYearAndSemester(Integer year, String semester);

    Optional<FormTemplate> findByYearAndSemesterAndSubject(Integer year, String semester, String subject);
}
