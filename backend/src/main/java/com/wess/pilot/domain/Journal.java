package com.wess.pilot.domain;

import com.wess.pilot.converter.StringMapConverter;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.Column;
import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

/** 주차별 실습 일지. 본문은 content(JSON, 텍스트형 양식) + fileKey(docx, OnlyOffice) 양쪽을 함께 관리한다. */
@Entity
@Table(name = "journals")
@Getter
@Setter
@NoArgsConstructor
public class Journal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @Column(nullable = false)
    private Integer week;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private JournalStatus status;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    /** FormTemplate.fields 의 key 에 대응하는 텍스트 입력값 (레거시 텍스트 폼) */
    @Convert(converter = StringMapConverter.class)
    @Column(name = "content", columnDefinition = "TEXT")
    private Map<String, String> content;

    @Column(name = "submitted_date")
    private LocalDate submittedDate;

    /** MinIO 객체 경로 (예: 2026/1/현장실습/student_1/week_2/log_file.docx). 최초 저장 전엔 객체가 실제 존재하지 않을 수 있음 */
    @Column(name = "file_key", nullable = false)
    private String fileKey;

    /** 에디터 표시용 파일명 (예: 2주차_일지.docx) */
    @Column(name = "file_name", nullable = false)
    private String fileName;

    /** docx 파일이 실제로 저장된 적이 있는지 여부 (OnlyOffice 콜백에서 true로 전환) */
    @Column(name = "file_saved", nullable = false)
    private boolean fileSaved = false;

    /** 문서 버전 식별용. OnlyOffice documentKey 계산에 사용 */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public void touch() {
        this.updatedAt = Instant.now();
    }
}
