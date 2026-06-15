package com.wess.pilot.service;

import com.wess.pilot.domain.Enrollment;
import com.wess.pilot.domain.Journal;
import com.wess.pilot.domain.JournalStatus;
import com.wess.pilot.domain.Student;
import com.wess.pilot.dto.AdminStatsDto;
import com.wess.pilot.dto.AdminStudentDto;
import com.wess.pilot.repository.EnrollmentRepository;
import com.wess.pilot.repository.FormTemplateRepository;
import com.wess.pilot.repository.JournalRepository;
import com.wess.pilot.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final JournalRepository journalRepository;
    private final FormTemplateRepository formTemplateRepository;

    @Transactional(readOnly = true)
    public List<AdminStudentDto> getStudents() {
        List<Student> students = studentRepository.findAll();
        return students.stream()
                .map(student -> new AdminStudentDto(
                        student.getId(),
                        student.getName(),
                        student.getMajor(),
                        student.getYear(),
                        completionRate(student.getId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdminStatsDto getStats(Integer year, String semester) {
        List<Enrollment> enrollments = (year != null && semester != null)
                ? enrollmentRepository.findByYearAndSemester(year, semester)
                : enrollmentRepository.findAll();

        List<Long> enrollmentIds = enrollments.stream().map(Enrollment::getId).collect(Collectors.toList());
        List<Journal> journals = enrollmentIds.isEmpty()
                ? List.of()
                : journalRepository.findByEnrollmentIdIn(enrollmentIds);

        long totalStudents = enrollments.stream().map(e -> e.getStudent().getId()).distinct().count();
        long totalJournals = journals.size();
        long completed = journals.stream()
                .filter(j -> j.getStatus() == JournalStatus.SUBMITTED || j.getStatus() == JournalStatus.REVIEWED)
                .count();
        int completionRate = totalJournals == 0 ? 0 : (int) Math.round(completed * 100.0 / totalJournals);

        long formTemplateCount = (year != null && semester != null)
                ? formTemplateRepository.findByYearAndSemester(year, semester).size()
                : formTemplateRepository.count();

        return new AdminStatsDto(totalStudents, completionRate, formTemplateCount, totalJournals);
    }

    private int completionRate(Long studentId) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(studentId);
        if (enrollments.isEmpty()) {
            return 0;
        }
        List<Long> enrollmentIds = enrollments.stream().map(Enrollment::getId).collect(Collectors.toList());
        List<Journal> journals = journalRepository.findByEnrollmentIdIn(enrollmentIds);
        if (journals.isEmpty()) {
            return 0;
        }
        long completed = journals.stream()
                .filter(j -> j.getStatus() == JournalStatus.SUBMITTED || j.getStatus() == JournalStatus.REVIEWED)
                .count();
        return (int) Math.round(completed * 100.0 / journals.size());
    }
}
