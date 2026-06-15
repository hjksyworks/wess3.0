package com.wess.pilot.service;

import com.wess.pilot.config.OnlyOfficeProperties;
import com.wess.pilot.domain.Enrollment;
import com.wess.pilot.domain.Feedback;
import com.wess.pilot.domain.Journal;
import com.wess.pilot.domain.JournalStatus;
import com.wess.pilot.exception.ResourceNotFoundException;
import com.wess.pilot.repository.EnrollmentRepository;
import com.wess.pilot.repository.FeedbackRepository;
import com.wess.pilot.repository.JournalRepository;
import com.wess.pilot.util.PdfMergeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * OnlyOffice ConvertService 를 이용해 일지 docx -> PDF 변환을 수행하고,
 * 필요 시 지도자 피드백 페이지를 추가하여 단건/일괄(zip) PDF를 생성한다.
 */
@Service
@RequiredArgsConstructor
public class PdfExportService {

    private static final int MAX_POLL_ATTEMPTS = 10;
    private static final long POLL_INTERVAL_MS = 1000L;

    private final JournalRepository journalRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final FeedbackRepository feedbackRepository;
    private final OnlyOfficeProperties onlyOfficeProperties;
    private final RestTemplate restTemplate;

    @Transactional(readOnly = true)
    public byte[] exportSingle(Long journalId, boolean includeFeedback) throws IOException {
        Journal journal = journalRepository.findById(journalId)
                .orElseThrow(() -> new ResourceNotFoundException("일지를 찾을 수 없습니다. id=" + journalId));

        byte[] pdf = convertJournalToPdf(journal);

        if (includeFeedback) {
            Optional<Feedback> feedback = feedbackRepository.findByJournalId(journalId);
            if (feedback.isPresent()) {
                pdf = PdfMergeUtil.appendTextPage(pdf, "지도자 피드백", feedbackBody(feedback.get()));
            }
        }
        return pdf;
    }

    @Transactional(readOnly = true)
    public byte[] exportZip(Integer year, String semester, boolean includeFeedback) throws IOException {
        List<Enrollment> enrollments = enrollmentRepository.findByYearAndSemester(year, semester);
        List<Long> enrollmentIds = enrollments.stream().map(Enrollment::getId).collect(Collectors.toList());

        List<Journal> journals = enrollmentIds.isEmpty()
                ? List.of()
                : journalRepository.findByEnrollmentIdIn(enrollmentIds);

        List<Journal> targets = journals.stream()
                .filter(j -> j.getStatus() == JournalStatus.SUBMITTED || j.getStatus() == JournalStatus.REVIEWED)
                .collect(Collectors.toList());

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            for (Journal journal : targets) {
                byte[] pdf = exportSingle(journal.getId(), includeFeedback);
                String studentName = journal.getEnrollment().getStudent().getName();
                String entryName = studentName + "_" + journal.getWeek() + "주차_일지.pdf";

                zos.putNextEntry(new ZipEntry(entryName));
                zos.write(pdf);
                zos.closeEntry();
            }

            zos.finish();
            return baos.toByteArray();
        }
    }

    /** OnlyOffice ConvertService 를 호출해 일지 docx 를 PDF 바이트로 변환한다. */
    private byte[] convertJournalToPdf(Journal journal) throws IOException {
        String convertUrl = onlyOfficeProperties.getInternalDocumentServerUrl() + onlyOfficeProperties.getConvertPath();
        String documentUrl = onlyOfficeProperties.getInternalBackendUrl() + "/api/journals/" + journal.getId() + "/file";
        String key = "pdf-" + journal.getId() + "-" + journal.getUpdatedAt().getEpochSecond();

        Map<String, Object> body = new HashMap<>();
        body.put("async", false);
        body.put("filetype", "docx");
        body.put("outputtype", "pdf");
        body.put("key", key);
        body.put("url", documentUrl);
        body.put("title", journal.getFileName() != null ? journal.getFileName() : "journal.docx");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        for (int attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
            ResponseEntity<Map> response = restTemplate.postForEntity(convertUrl, request, Map.class);
            Map<?, ?> result = response.getBody();

            if (result != null) {
                Object error = result.get("error");
                if (error != null && toInt(error) != 0) {
                    throw new IOException("OnlyOffice ConvertService 오류 (code=" + error + ")");
                }
                Object fileUrl = result.get("fileUrl");
                if (Boolean.TRUE.equals(result.get("endConvert")) && fileUrl != null) {
                    byte[] pdf = restTemplate.getForObject(String.valueOf(fileUrl), byte[].class);
                    if (pdf == null) {
                        throw new IOException("변환된 PDF를 다운로드할 수 없습니다.");
                    }
                    return pdf;
                }
            }

            sleep();
        }

        throw new IOException("PDF 변환이 시간 내에 완료되지 않았습니다. journalId=" + journal.getId());
    }

    private String feedbackBody(Feedback feedback) {
        return "작성자: " + feedback.getSupervisorName()
                + "\n작성일: " + feedback.getDate()
                + "\n\n" + feedback.getContent();
    }

    private int toInt(Object value) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private void sleep() {
        try {
            Thread.sleep(POLL_INTERVAL_MS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
