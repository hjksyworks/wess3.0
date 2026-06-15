package com.wess.pilot.dto;

import com.wess.pilot.domain.Feedback;
import com.wess.pilot.domain.Journal;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class JournalDto {

    private Long id;
    private Long enrollmentId;
    private Integer week;
    private String status;
    private LocalDate startDate;
    private LocalDate endDate;
    private Map<String, String> content;
    private LocalDate submittedDate;
    private boolean hasFeedback;
    private Long studentId;
    private String studentName;
    private String feedbackContent;
    /** OnlyOffice document.url 에 사용 (백엔드 스트리밍 엔드포인트) */
    private String fileUrl;
    /** 에디터에 표시될 파일명 */
    private String fileName;
    /** OnlyOffice document.key (저장될 때마다 갱신됨) */
    private String documentKey;
    /** OnlyOffice 컨테이너가 문서를 다운로드할 내부 URL (자체서명 인증서 회피용 내부망 HTTP 주소) */
    private String documentUrl;
    /** OnlyOffice 컨테이너가 저장 콜백을 보낼 내부 URL */
    private String callbackUrl;

    public static JournalDto from(Journal journal, Optional<Feedback> feedback) {
        JournalDto dto = new JournalDto();
        dto.setId(journal.getId());
        dto.setEnrollmentId(journal.getEnrollment().getId());
        dto.setWeek(journal.getWeek());
        dto.setStatus(journal.getStatus().name());
        dto.setStartDate(journal.getStartDate());
        dto.setEndDate(journal.getEndDate());
        dto.setContent(journal.getContent());
        dto.setSubmittedDate(journal.getSubmittedDate());
        dto.setStudentId(journal.getEnrollment().getStudent().getId());
        dto.setStudentName(journal.getEnrollment().getStudent().getName());
        dto.setFileUrl("/api/journals/" + journal.getId() + "/file");
        dto.setDocumentUrl("/api/journals/" + journal.getId() + "/file");
        dto.setCallbackUrl("/api/journals/" + journal.getId() + "/callback");
        dto.setFileName(journal.getFileName());
        dto.setDocumentKey("journal-" + journal.getId() + "-" + journal.getUpdatedAt().getEpochSecond());
        dto.setHasFeedback(feedback.isPresent());
        feedback.ifPresent(f -> dto.setFeedbackContent(f.getContent()));
        return dto;
    }
}
