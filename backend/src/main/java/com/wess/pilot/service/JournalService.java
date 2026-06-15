package com.wess.pilot.service;

import com.wess.pilot.config.OnlyOfficeProperties;
import com.wess.pilot.domain.Enrollment;
import com.wess.pilot.domain.FormTemplate;
import com.wess.pilot.domain.Journal;
import com.wess.pilot.domain.JournalStatus;
import com.wess.pilot.dto.FileContent;
import com.wess.pilot.dto.JournalDto;
import com.wess.pilot.dto.JournalUpdateRequest;
import com.wess.pilot.dto.OnlyOfficeCallbackRequest;
import com.wess.pilot.exception.ResourceNotFoundException;
import com.wess.pilot.repository.FeedbackRepository;
import com.wess.pilot.repository.JournalRepository;
import com.wess.pilot.util.BlankDocxFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JournalService {

    public static final String DOCX_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private final JournalRepository journalRepository;
    private final FeedbackRepository feedbackRepository;
    private final StorageService storageService;
    private final RestTemplate restTemplate;
    private final OnlyOfficeProperties onlyOfficeProperties;

    @Transactional(readOnly = true)
    public List<JournalDto> findByEnrollment(Long enrollmentId) {
        return journalRepository.findByEnrollmentId(enrollmentId).stream()
                .sorted((a, b) -> Integer.compare(a.getWeek(), b.getWeek()))
                .map(j -> applyInternalUrls(JournalDto.from(j, feedbackRepository.findByJournalId(j.getId()))))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public JournalDto findById(Long id) {
        Journal journal = getJournalOrThrow(id);
        return applyInternalUrls(JournalDto.from(journal, feedbackRepository.findByJournalId(journal.getId())));
    }

    /**
     * OnlyOffice 컨테이너가 직접 호출하는 documentUrl/callbackUrl 을 도커 내부망 주소로 덮어쓴다.
     * nginx의 자체서명 인증서로 인한 DEPTH_ZERO_SELF_SIGNED_CERT 오류를 회피하기 위함.
     */
    private JournalDto applyInternalUrls(JournalDto dto) {
        String base = onlyOfficeProperties.getInternalBackendUrl();
        if (base != null && !base.isEmpty()) {
            dto.setDocumentUrl(base + "/api/journals/" + dto.getId() + "/file");
            dto.setCallbackUrl(base + "/api/journals/" + dto.getId() + "/callback");
        }
        return dto;
    }

    @Transactional
    public JournalDto update(Long id, JournalUpdateRequest request) {
        Journal journal = getJournalOrThrow(id);

        if (journal.getStatus() != JournalStatus.WRITING) {
            throw new IllegalStateException("제출된 일지는 수정할 수 없습니다.");
        }

        if (request.getContent() != null) {
            Map<String, String> merged = new LinkedHashMap<>(
                    journal.getContent() != null ? journal.getContent() : new LinkedHashMap<>());
            merged.putAll(request.getContent());
            journal.setContent(merged);
        }
        if (request.getStartDate() != null) {
            journal.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            journal.setEndDate(request.getEndDate());
        }
        if ("SUBMITTED".equals(request.getStatus())) {
            journal.setStatus(JournalStatus.SUBMITTED);
            journal.setSubmittedDate(LocalDate.now());
        }

        journal.touch();
        Journal saved = journalRepository.save(journal);
        return applyInternalUrls(JournalDto.from(saved, feedbackRepository.findByJournalId(saved.getId())));
    }

    /** GET /api/journals/{id}/file — 일지 docx 스트리밍 (없으면 템플릿, 그것도 없으면 빈 docx) */
    @Transactional
    public FileContent getFile(Long id) throws IOException {
        Journal journal = getJournalOrThrow(id);
        String fileKey = ensureFileKey(journal);
        String fileName = journal.getFileName() != null
                ? journal.getFileName()
                : journal.getWeek() + "주차_일지.docx";

        if (storageService.exists(fileKey)) {
            byte[] bytes = storageService.getObjectBytes(fileKey);
            return new FileContent(bytes, fileName, DOCX_CONTENT_TYPE);
        }

        FormTemplate template = journal.getEnrollment().getFormTemplate();
        String templateKey = template != null ? template.getTemplateFileKey() : null;
        if (templateKey != null && storageService.exists(templateKey)) {
            byte[] bytes = storageService.getObjectBytes(templateKey);
            return new FileContent(bytes, fileName, DOCX_CONTENT_TYPE);
        }

        return new FileContent(BlankDocxFactory.create(), fileName, DOCX_CONTENT_TYPE);
    }

    /** POST /api/journals/{id}/callback — OnlyOffice 저장 콜백 */
    @Transactional
    public Map<String, Object> handleCallback(Long id, OnlyOfficeCallbackRequest callback) {
        Map<String, Object> response = new LinkedHashMap<>();
        Journal journal = journalRepository.findById(id).orElse(null);

        if (journal == null) {
            response.put("error", 1);
            return response;
        }

        if (journal.getStatus() != JournalStatus.WRITING) {
            // 제출/검토 완료된 일지는 더 이상 수정 불가 (immutable 규칙)
            response.put("error", 1);
            return response;
        }

        Integer status = callback.getStatus();
        if (status != null && (status == 2 || status == 6) && callback.getUrl() != null) {
            try {
                byte[] content = restTemplate.getForObject(callback.getUrl(), byte[].class);
                if (content != null) {
                    String fileKey = ensureFileKey(journal);
                    storageService.putObject(fileKey, content, DOCX_CONTENT_TYPE);
                    journal.setFileSaved(true);
                    journal.touch();
                    journalRepository.save(journal);
                }
            } catch (Exception e) {
                response.put("error", 1);
                return response;
            }
        }

        response.put("error", 0);
        return response;
    }

    private Journal getJournalOrThrow(Long id) {
        return journalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("일지를 찾을 수 없습니다. id=" + id));
    }

    /** journals.file_key 가 비어있으면 enrollment 정보로 경로를 계산해 저장한다. */
    private String ensureFileKey(Journal journal) {
        if (journal.getFileKey() != null && !journal.getFileKey().isEmpty()) {
            return journal.getFileKey();
        }
        Enrollment enrollment = journal.getEnrollment();
        String safeSubject = enrollment.getSubject() != null
                ? enrollment.getSubject().replaceAll("[\\\\/:*?\"<>|]", "_")
                : "subject";
        String key = StorageService.journalKey(
                enrollment.getYear(),
                enrollment.getSemester(),
                safeSubject,
                enrollment.getStudent().getId(),
                journal.getWeek());
        journal.setFileKey(key);
        if (journal.getFileName() == null) {
            journal.setFileName(journal.getWeek() + "주차_일지.docx");
        }
        journalRepository.save(journal);
        return key;
    }
}
