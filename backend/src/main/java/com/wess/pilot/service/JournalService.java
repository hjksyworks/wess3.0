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
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
@RequiredArgsConstructor
public class JournalService {

    public static final String DOCX_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private final JournalRepository journalRepository;
    private final FeedbackRepository feedbackRepository;
    private final StorageService storageService;
    private final RestTemplate restTemplate;
    private final OnlyOfficeProperties onlyOfficeProperties;
    private final com.wess.pilot.security.Authz authz;
    private final com.wess.pilot.security.LinkSigner linkSigner;

    @Transactional(readOnly = true)
    public List<JournalDto> findByEnrollment(Long enrollmentId) {
        List<Journal> journals = journalRepository.findByEnrollmentId(enrollmentId);
        if (!journals.isEmpty()) {
            authz.assertJournalRead(journals.get(0));
        }
        return journals.stream()
                .sorted((a, b) -> Integer.compare(a.getWeek(), b.getWeek()))
                .map(j -> applyInternalUrls(JournalDto.from(j, feedbackRepository.findByJournalId(j.getId()))))
                .collect(Collectors.toList());
    }

    /** 지도자/관리자 검토 대상: 제출/검토완료 일지 전체 (F1: 배정 연결 전까지 전체 열람 — 파일럿 posture) */
    @Transactional(readOnly = true)
    public List<JournalDto> findReviewable() {
        authz.assertStaff();
        return journalRepository.findByStatusIn(
                        java.util.List.of(JournalStatus.SUBMITTED, JournalStatus.REVIEWED, JournalStatus.MODIFIED, JournalStatus.CORRECTION_REQUESTED)).stream()
                .sorted((a, b) -> {
                    int s = a.getEnrollment().getStudent().getName()
                            .compareTo(b.getEnrollment().getStudent().getName());
                    return s != 0 ? s : Integer.compare(a.getWeek(), b.getWeek());
                })
                .map(j -> applyInternalUrls(JournalDto.from(j, feedbackRepository.findByJournalId(j.getId()))))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public JournalDto findById(Long id) {
        Journal journal = getJournalOrThrow(id);
        authz.assertJournalRead(journal);
        return applyInternalUrls(JournalDto.from(journal, feedbackRepository.findByJournalId(journal.getId())));
    }

    /**
     * OnlyOffice 컨테이너가 직접 호출하는 documentUrl/callbackUrl 을 도커 내부망 주소로 덮어쓴다.
     * nginx의 자체서명 인증서로 인한 DEPTH_ZERO_SELF_SIGNED_CERT 오류를 회피하기 위함.
     */
    private JournalDto applyInternalUrls(JournalDto dto) {
        String base = onlyOfficeProperties.getInternalBackendUrl();
        if (base != null && !base.isEmpty()) {
            String t = linkSigner.sign("journal:" + dto.getId());
            dto.setDocumentUrl(base + "/api/journals/" + dto.getId() + "/file?t=" + t);
            dto.setCallbackUrl(base + "/api/journals/" + dto.getId() + "/callback?t=" + t);
        }
        return dto;
    }

    @Transactional
    public JournalDto update(Long id, JournalUpdateRequest request) {
        Journal journal = getJournalOrThrow(id);
        authz.assertJournalWriteByOwner(journalRepository.findOwnerStudentId(id).orElse(null));

        if (!isEditableById(id)) {
            throw new IllegalStateException("실습 마감일이 지나 수정할 수 없습니다.");
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
            journal.setStatus(journal.getStatus() == JournalStatus.REVIEWED
                    ? JournalStatus.MODIFIED : JournalStatus.SUBMITTED);
            journal.setSubmittedDate(LocalDate.now());
        } else if (journal.getStatus() == JournalStatus.REVIEWED && request.getContent() != null) {
            journal.setStatus(JournalStatus.MODIFIED);
        }

        journal.touch();
        Journal saved = journalRepository.save(journal);
        return applyInternalUrls(JournalDto.from(saved, feedbackRepository.findByJournalId(saved.getId())));
    }

    /** GET /api/journals/{id}/file — 일지 docx 스트리밍 (없으면 템플릿, 그것도 없으면 빈 docx) */
    @Transactional
    public FileContent getFile(Long id, String token) throws IOException {
        if (!linkSigner.verify("journal:" + id, token)) {
            throw new org.springframework.security.access.AccessDeniedException("유효하지 않은 문서 링크입니다.");
        }
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
    public Map<String, Object> handleCallback(Long id, String token, OnlyOfficeCallbackRequest callback) {
        Map<String, Object> response = new LinkedHashMap<>();
        if (!linkSigner.verify("journal:" + id, token)) {
            response.put("error", 1); // 토큰 없음/위조 -> 콜백 거부(F7)
            return response;
        }
        Journal journal = journalRepository.findById(id).orElse(null);

        if (journal == null) {
            response.put("error", 1);
            return response;
        }

        if (!isEditableById(id)) {
            // 실습 마감일이 지난 일지는 수정 불가
            response.put("error", 1);
            return response;
        }

        Integer status = callback.getStatus();
        if (status != null && (status == 2 || status == 6) && callback.getUrl() != null) {
            try {
                // URI 오버로드 필수. String 오버로드는 URI 템플릿으로 보고 재인코딩하므로
                // OnlyOffice 콜백 URL의 한글 파일명(%EC..)이 %25EC.. 로 이중 인코딩되어
                // md5 서명 검증에 실패하고 403 -> 저장 실패(error:1)가 된다.
                byte[] content = restTemplate.getForObject(toInternalFileUri(callback.getUrl()), byte[].class);
                if (content != null) {
                    String fileKey = ensureFileKey(journal);
                    storageService.putObject(fileKey, content, DOCX_CONTENT_TYPE);
                    journal.setFileSaved(true);
                    if (journal.getWrittenDate() == null) {
                        journal.setWrittenDate(LocalDate.now()); // 첫 작성일 기록
                    }
                    JournalStatus cur = journal.getStatus();
                    if (Boolean.TRUE.equals(journal.getSubmitRequested())) {
                        // 저장 확정. 검토완료본 재저장->수정저장, 정정요청본 재저장->제출(재검토)
                        JournalStatus next = cur == JournalStatus.REVIEWED
                                ? JournalStatus.MODIFIED : JournalStatus.SUBMITTED;
                        journal.setStatus(next);
                        journal.setSubmittedDate(LocalDate.now());
                        journal.setSubmitRequested(false);
                        log.info("[callback] journalId={} 저장확정 -> {} (status={})", id, next, status);
                    } else if (cur == JournalStatus.REVIEWED) {
                        journal.setStatus(JournalStatus.MODIFIED);
                        log.info("[callback] journalId={} 검토완료본 수정 -> MODIFIED", id);
                    } else if (cur == JournalStatus.CORRECTION_REQUESTED) {
                        journal.setStatus(JournalStatus.SUBMITTED); // 정정 반영 -> 재검토 대기
                        log.info("[callback] journalId={} 정정 반영 -> SUBMITTED", id);
                    }
                    journal.touch();
                    journalRepository.save(journal);
                }
            } catch (Exception e) {
                // 콜백 저장 실패 원인을 반드시 남긴다 (기존에는 예외를 삼켜 진단이 불가능했다)
                log.error("[callback] 일지 저장 실패 journalId={} status={} url={}",
                        id, status, callback.getUrl(), e);
                response.put("error", 1);
                return response;
            }
        }

        response.put("error", 0);
        return response;
    }


    /**
     * OnlyOffice가 콜백으로 돌려주는 파일 URL은 브라우저 세션의 Host를 따르므로
     * https://11.11.11.99/... 형태가 된다. 외부 nginx는 자체서명 인증서를 쓰기 때문에
     * JVM이 PKIX 검증에 실패한다(SSLHandshakeException). 파일 실체는 OnlyOffice 컨테이너에
     * 있으므로 도커 내부망 주소(http://onlyoffice-app)로 바꿔서 평문으로 받아온다.
     *
     * getRawPath()/getRawQuery()를 쓰는 이유: 이미 percent-encoding된 한글 파일명을
     * 다시 인코딩하면 md5 서명 검증에 실패해 403이 된다.
     */
    private java.net.URI toInternalFileUri(String rawUrl) {
        java.net.URI original = java.net.URI.create(rawUrl);
        String base = onlyOfficeProperties.getInternalDocumentServerUrl();
        if (base == null || base.isEmpty()) {
            return original;
        }
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        java.net.URI baseUri = java.net.URI.create(base);
        if (baseUri.getHost() == null || baseUri.getHost().equals(original.getHost())) {
            return original;
        }
        StringBuilder sb = new StringBuilder(base).append(original.getRawPath());
        if (original.getRawQuery() != null) {
            sb.append('?').append(original.getRawQuery());
        }
        return java.net.URI.create(sb.toString());
    }

    /**
     * 최종 제출. 상태를 즉시 바꾸지 않고 submitRequested 만 세운 뒤 강제저장을 유도한다.
     * 실제 SUBMITTED 전이는 파일을 저장하는 콜백(강제저장 status6 또는 편집기 종료 status2)에서
     * 파일 저장과 '동시에' 일어난다(handleCallback). 상태를 먼저 바꿔 콜백이 거부되며 마지막
     * 편집이 유실되던 문제(6주차 사고, forcesave 키 불일치 경쟁)를 근본적으로 없앤다.
     */
    public void submit(Long id, String documentKey) {
        Journal journal = getJournalOrThrow(id);
        authz.assertJournalWriteByOwner(journalRepository.findOwnerStudentId(id).orElse(null));
        if (!isEditableById(id)) {
            throw new IllegalStateException("실습 마감일이 지나 저장할 수 없습니다.");
        }
        journal.setSubmitRequested(true);
        journal.touch();
        journalRepository.save(journal);
        int cmdError = forceSave(documentKey);
        log.info("[submit] journalId={} forcesave error={} (0=세션활성, 콜백이 저장+확정)", id, cmdError);
        if (cmdError != 0) {
            // 활성 세션/변경분이 없어 저장 콜백이 오지 않는다 -> 즉시 확정(파일은 이미 저장됨).
            // 그대로 두면 프론트 폴백(pollSubmitted->finalize-submit)의 ~27초 뒤에야 전이돼
            // 저장을 눌러도 한동안 '작성중'으로 보이는 문제가 생긴다.
            finalizeSubmit(id);
            log.info("[submit] journalId={} 저장 콜백 없음 -> 즉시 확정", id);
        }
    }

    /** 임시저장: 강제저장으로 편집기 내용을 확정 저장. 상태는 WRITING 유지. */
    public void saveDraft(Long id, String documentKey) {
        Journal journal = getJournalOrThrow(id);
        authz.assertJournalWriteByOwner(journalRepository.findOwnerStudentId(id).orElse(null));
        if (!isEditableById(id)) {
            throw new IllegalStateException("실습 마감일이 지나 저장할 수 없습니다.");
        }
        // 임시저장은 '제출 의도'가 아니다. 이전에 남은 제출대기 플래그를 해제해
        // 임시저장 콜백이 실수로 SUBMITTED 로 확정하는 것을 막는다.
        if (Boolean.TRUE.equals(journal.getSubmitRequested())) {
            journal.setSubmitRequested(false);
            journalRepository.save(journal);
        }
        long beforeEpoch = journal.getUpdatedAt() != null ? journal.getUpdatedAt().getEpochSecond() : 0L;
        boolean beforeSaved = journal.isFileSaved();
        int cmdError = forceSave(documentKey);
        log.info("[forcesave] journalId={} error={}", id, cmdError);
        if (cmdError != 0) {
            return; // 세션 없음/변경 없음 -> 현재 저장 상태 인정
        }
        for (int i = 0; i < 24; i++) {
            try {
                Thread.sleep(500L);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
            Journal now = journalRepository.findById(id).orElse(null);
            if (now == null) {
                break;
            }
            long nowEpoch = now.getUpdatedAt() != null ? now.getUpdatedAt().getEpochSecond() : 0L;
            if (now.isFileSaved() && (nowEpoch > beforeEpoch || !beforeSaved)) {
                return;
            }
        }
        throw new IllegalStateException("문서 저장을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }

    /** 제출 확정 폴백. 콜백이 끝내 오지 않을 때(세션/변경 없음) 현재 저장 상태로 SUBMITTED 전이. */
    @Transactional
    public void finalizeSubmit(Long id) {
        Journal j = getJournalOrThrow(id);
        authz.assertJournalWriteByOwner(journalRepository.findOwnerStudentId(id).orElse(null));
        if (Boolean.TRUE.equals(j.getSubmitRequested())) {
            j.setStatus(j.getStatus() == JournalStatus.REVIEWED
                    ? JournalStatus.MODIFIED : JournalStatus.SUBMITTED);
            j.setSubmittedDate(LocalDate.now());
            j.setSubmitRequested(false);
            j.touch();
            journalRepository.save(j);
            log.info("[submit] journalId={} 폴백 확정 -> {}", id, j.getStatus());
        }
    }

    /** OnlyOffice CommandService 로 forcesave 명령 전송. 반환값은 OnlyOffice error 코드(0=접수됨, 저장 콜백 예정). */
    private int forceSave(String documentKey) {
        if (documentKey == null || documentKey.isEmpty()) {
            return -1;
        }
        try {
            String url = onlyOfficeProperties.getInternalDocumentServerUrl() + "/coauthoring/CommandService.ashx";
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("c", "forcesave");
            body.put("key", documentKey);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            org.springframework.http.HttpEntity<java.util.Map<String, Object>> httpReq =
                    new org.springframework.http.HttpEntity<>(body, headers);
            java.util.Map<?, ?> res = restTemplate.postForObject(url, httpReq, java.util.Map.class);
            if (res == null) {
                return -1;
            }
            Object err = res.get("error");
            return (err instanceof Number) ? ((Number) err).intValue() : -1;
        } catch (Exception e) {
            log.error("[forcesave] CommandService 호출 실패 key={}", documentKey, e);
            return -1;
        }
    }

    /** 교수 정정요청: 제출/검토완료/수정저장 일지를 CORRECTION_REQUESTED 로 바꾸고 사유 저장 */
    @Transactional
    public void requestCorrection(Long id, String reason) {
        authz.assertStaff();
        Journal j = getJournalOrThrow(id);
        if (j.getStatus() == JournalStatus.WRITING) {
            throw new IllegalStateException("아직 제출되지 않은 일지에는 정정요청할 수 없습니다.");
        }
        j.setStatus(JournalStatus.CORRECTION_REQUESTED);
        j.setCorrectionReason(reason);
        j.touch();
        journalRepository.save(j);
        log.info("[correction] journalId={} 정정요청", id);
    }

    /** 실습 마감일(enrollment.endDate)까지 수정 가능. endDate 없으면 제한 없음. */
    private boolean isEditableById(Long id) {
        java.time.LocalDate end = journalRepository.findDeadline(id).orElse(null);
        return end == null || !java.time.LocalDate.now().isAfter(end);
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
        String key;
        if (journal.getEntryDate() != null) {
            key = StorageService.dailyKey(enrollment.getYear(), enrollment.getSemester(),
                    safeSubject, enrollment.getStudent().getId(), journal.getEntryDate());
        } else {
            key = StorageService.journalKey(enrollment.getYear(), enrollment.getSemester(),
                    safeSubject, enrollment.getStudent().getId(), journal.getWeek());
        }
        journal.setFileKey(key);
        if (journal.getFileName() == null) {
            journal.setFileName(journal.getEntryDate() != null
                    ? journal.getEntryDate() + "_일지.docx" : journal.getWeek() + "주차_일지.docx");
        }
        journalRepository.save(journal);
        return key;
    }
}
