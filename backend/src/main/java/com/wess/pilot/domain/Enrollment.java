package com.wess.pilot.domain;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import java.time.LocalDate;

/** 학생의 학기별 실습 배정 (양식 템플릿 + 실습 정보) */
@Entity
@Table(name = "enrollments")
@Getter
@Setter
@NoArgsConstructor
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_template_id", nullable = false)
    private FormTemplate formTemplate;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false, length = 1)
    private String semester;

    @Column(nullable = false)
    private String subject;

    /** 실습 기관/부서명 */
    @Column(name = "practice_name")
    private String practiceName;

    /** 담당 지도자명 (별도 인증체계 확정 전까지 표시용) */
    @Column(name = "supervisor_name")
    private String supervisorName;

    @Column(name = "total_weeks", nullable = false)
    private Integer totalWeeks;

    @Column(name = "created_date", nullable = false)
    private LocalDate createdDate;
}
