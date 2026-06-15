package com.wess.pilot.controller;

import com.wess.pilot.dto.FileContent;
import com.wess.pilot.dto.JournalDto;
import com.wess.pilot.dto.JournalUpdateRequest;
import com.wess.pilot.dto.OnlyOfficeCallbackRequest;
import com.wess.pilot.service.JournalService;
import com.wess.pilot.service.PdfExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/journals")
@RequiredArgsConstructor
public class JournalController {

    private final JournalService journalService;
    private final PdfExportService pdfExportService;

    /** GET /api/journals?enrollmentId= — 학생/지도자 주차별 일지 목록 */
    @GetMapping
    public List<JournalDto> list(@RequestParam(required = false) Long enrollmentId) {
        if (enrollmentId == null) {
            throw new IllegalArgumentException("enrollmentId 파라미터가 필요합니다.");
        }
        return journalService.findByEnrollment(enrollmentId);
    }

    @GetMapping("/{id}")
    public JournalDto get(@PathVariable Long id) {
        return journalService.findById(id);
    }

    @PutMapping("/{id}")
    public JournalDto update(@PathVariable Long id, @RequestBody JournalUpdateRequest request) {
        return journalService.update(id, request);
    }

    /** GET /api/journals/{id}/file — OnlyOffice document.url (docx 스트리밍) */
    @GetMapping("/{id}/file")
    public ResponseEntity<byte[]> file(@PathVariable Long id) throws IOException {
        FileContent file = journalService.getFile(id);
        String encodedName = java.net.URLEncoder.encode(file.getFileName(), StandardCharsets.UTF_8)
                .replace("+", "%20");

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(encodedName, StandardCharsets.UTF_8).build().toString())
                .body(file.getBytes());
    }

    /** POST /api/journals/{id}/callback — OnlyOffice 저장 콜백 */
    @PostMapping("/{id}/callback")
    public Map<String, Object> callback(@PathVariable Long id, @RequestBody OnlyOfficeCallbackRequest callback) {
        return journalService.handleCallback(id, callback);
    }

    /** GET /api/journals/{id}/pdf — 단건 PDF (관리자/지도자 개별 조회·다운로드) */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> pdf(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean includeFeedback) throws IOException {

        byte[] pdf = pdfExportService.exportSingle(id, includeFeedback);
        JournalDto journal = journalService.findById(id);
        String baseName = journal.getFileName() != null
                ? journal.getFileName().replaceAll("\\.docx$", "")
                : "journal-" + id;

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(baseName + ".pdf", StandardCharsets.UTF_8).build().toString())
                .body(pdf);
    }
}
