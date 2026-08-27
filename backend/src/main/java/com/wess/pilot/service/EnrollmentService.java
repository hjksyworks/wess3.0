package com.wess.pilot.service;

import com.wess.pilot.domain.Enrollment;
import com.wess.pilot.domain.FormTemplate;
import com.wess.pilot.domain.Journal;
import com.wess.pilot.domain.JournalStatus;
import com.wess.pilot.domain.Student;
import com.wess.pilot.dto.EnrollmentCreateRequest;
import com.wess.pilot.dto.EnrollmentDto;
import com.wess.pilot.exception.ResourceNotFoundException;
import com.wess.pilot.repository.EnrollmentRepository;
import com.wess.pilot.repository.FormTemplateRepository;
import com.wess.pilot.repository.JournalRepository;
import com.wess.pilot.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final FormTemplateRepository formTemplateRepository;
    private final JournalRepository journalRepository;
    private final com.wess.pilot.security.Authz authz;

    @Transactional(readOnly = true)
    public List<EnrollmentDto> list(Long studentId, Integer year, String semester) {
        if (authz.isStudent()) {
            // 학생은 본인 배정만 조회 가능 (파라미터 무시)
            studentId = authz.currentStudentId();
            year = null;
            semester = null;
        }
        List<Enrollment> enrollments;
        if (studentId != null) {
            enrollments = enrollmentRepository.findByStudentId(studentId);
        } else if (year != null && semester != null) {
            enrollments = enrollmentRepository.findByYearAndSemester(year, semester);
        } else {
            enrollments = enrollmentRepository.findAll();
        }
        return enrollments.stream().map(EnrollmentDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EnrollmentDto findById(Long id) {
        Enrollment e = getEnrollmentOrThrow(id);
        authz.assertEnrollmentRead(e);
        return EnrollmentDto.from(e);
    }

    /** 로그인한 학생 본인의 가장 최근 실습 배정 (StudentDashboard 초기 진입용) */
    @Transactional(readOnly = true)
    public EnrollmentDto findCurrentForStudent(Long studentId) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(studentId);
        Enrollment latest = enrollments.stream()
                .max(Comparator.comparing(Enrollment::getCreatedDate).thenComparing(Enrollment::getId))
                .orElseThrow(() -> new ResourceNotFoundException("배정된 실습 정보가 없습니다."));
        return EnrollmentDto.from(latest);
    }

    /** 실습 배정 생성 + 주차별 Journal 자동 생성 */
    @Transactional
    public EnrollmentDto create(EnrollmentCreateRequest request) {
        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("학생을 찾을 수 없습니다. id=" + request.getStudentId()));
        FormTemplate formTemplate = formTemplateRepository.findById(request.getFormTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("양식 템플릿을 찾을 수 없습니다. id=" + request.getFormTemplateId()));

        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(student);
        enrollment.setFormTemplate(formTemplate);
        enrollment.setYear(request.getYear());
        enrollment.setSemester(request.getSemester());
        enrollment.setSubject(request.getSubject());
        enrollment.setPracticeName(request.getPracticeName());
        enrollment.setSupervisorName(request.getSupervisorName());
        enrollment.setTotalWeeks(request.getTotalWeeks());
        enrollment.setStartDate(request.getStartDate());
        enrollment.setEndDate(request.getEndDate());
        enrollment.setCreatedDate(LocalDate.now());

        Enrollment saved = enrollmentRepository.save(enrollment);

        com.wess.pilot.domain.JournalCadence cadence = formTemplate.getCadence() != null
                ? formTemplate.getCadence() : com.wess.pilot.domain.JournalCadence.WEEKLY;
        List<Journal> journals = new ArrayList<>();
        if (cadence == com.wess.pilot.domain.JournalCadence.DAILY) {
            LocalDate start = request.getStartDate();
            if (start == null) {
                throw new IllegalArgumentException("일별 양식은 실습 시작일(startDate)이 필요합니다.");
            }
            for (int w = 0; w < request.getTotalWeeks(); w++) {
                LocalDate weekStart = start.plusWeeks(w);
                for (int d = 0; d < 5; d++) {
                    LocalDate day = weekStart.plusDays(d);
                    if (request.getEndDate() != null && day.isAfter(request.getEndDate())) {
                        break;
                    }
                    Journal journal = new Journal();
                    journal.setEnrollment(saved);
                    journal.setWeek(w + 1);
                    journal.setEntryDate(day);
                    journal.setStartDate(day);
                    journal.setEndDate(day);
                    journal.setStatus(JournalStatus.WRITING);
                    journal.setContent(new LinkedHashMap<>());
                    journal.setFileKey("");
                    journal.setFileName(day + "_일지.docx");
                    journal.setFileSaved(false);
                    journal.setUpdatedAt(Instant.now());
                    journals.add(journal);
                }
            }
        } else {
            LocalDate start = request.getStartDate();
            for (int week = 1; week <= request.getTotalWeeks(); week++) {
                Journal journal = new Journal();
                journal.setEnrollment(saved);
                journal.setWeek(week);
                journal.setStatus(JournalStatus.WRITING);
                journal.setContent(new LinkedHashMap<>());
                journal.setFileKey("");
                journal.setFileName(week + "주차_일지.docx");
                journal.setFileSaved(false);
                journal.setUpdatedAt(Instant.now());
                if (start != null) {
                    LocalDate ws = start.plusWeeks(week - 1);
                    journal.setStartDate(ws);
                    journal.setEndDate(ws.plusDays(4));
                }
                journals.add(journal);
            }
        }
        journalRepository.saveAll(journals);

        return EnrollmentDto.from(saved);
    }

    private Enrollment getEnrollmentOrThrow(Long id) {
        return enrollmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("실습 배정 정보를 찾을 수 없습니다. id=" + id));
    }
}
