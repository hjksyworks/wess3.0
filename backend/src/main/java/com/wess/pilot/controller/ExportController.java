package com.wess.pilot.controller;

import com.wess.pilot.service.PdfExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** 관리자 - 일지 PDF 일괄 다운로드 */
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

    private final PdfExportService pdfExportService;

    @GetMapping("/journals")
    public ResponseEntity<byte[]> exportJournals(
            @RequestParam Integer year,
            @RequestParam String semester,
            @RequestParam(defaultValue = "false") boolean includeFeedback) throws IOException {

        byte[] zip = pdfExportService.exportZip(year, semester, includeFeedback);
        String fileName = "journals_" + year + "_" + semester + ".zip";

        return ResponseEntity.ok()
                .contentType(MediaType.valueOf("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(fileName, StandardCharsets.UTF_8).build().toString())
                .body(zip);
    }
}
