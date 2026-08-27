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
    public List<JournalDto> list(@RequestParam(required = false) Long enrollmentId,
                                @RequestParam(required = false) String role) {
        if (enrollmentId != null) {
            return journalService.findByEnrollment(enrollmentId);
        }
        // enrollmentId 없음 → 지도자/관리자 검토 대상 목록
        return journalService.findReviewable();
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
    public ResponseEntity<byte[]> file(@PathVariable Long id,
            @RequestParam(name = "t", required = false) String t) throws IOException {
        FileContent file = journalService.getFile(id, t);
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
    public Map<String, Object> callback(@PathVariable Long id,
            @RequestParam(name = "t", required = false) String t,
            @RequestBody OnlyOfficeCallbackRequest callback) {
        return journalService.handleCallback(id, t, callback);
    }

    /** POST /api/journals/{id}/submit — 편집기 강제저장 확정 후 제출(잠금). body: {documentKey} */
    @PostMapping("/{id}/submit")
    public JournalDto submit(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String documentKey = body != null ? body.get("documentKey") : null;
        journalService.submit(id, documentKey);
        return journalService.findById(id);
    }

    /** POST /api/journals/{id}/finalize-submit — 제출 콜백 지연 시 프론트가 호출하는 폴백 확정 */
    @PostMapping("/{id}/finalize-submit")
    public JournalDto finalizeSubmit(@PathVariable Long id) {
        journalService.finalizeSubmit(id);
        return journalService.findById(id);
    }

    /** POST /api/journals/{id}/forcesave — 편집기 내용 강제저장(임시저장, 상태 유지). body: {documentKey} */
    @PostMapping("/{id}/forcesave")
    public JournalDto forcesave(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String documentKey = body != null ? body.get("documentKey") : null;
        journalService.saveDraft(id, documentKey);
        return journalService.findById(id);
    }

    /** GET /api/journals/{id}/pdf — 단건 PDF (관리자/지도자 개별 조회·다운로드) */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> pdf(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean includeFeedback) throws IOException {

        JournalDto journal = journalService.findById(id); // 소유권 검증(STUDENT 본인만)
        byte[] pdf = pdfExportService.exportSingle(id, includeFeedback);
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
