package com.wess.pilot.controller;

import com.wess.pilot.dto.FileContent;
import com.wess.pilot.dto.FormTemplateCreateRequest;
import com.wess.pilot.dto.FormTemplateDto;
import com.wess.pilot.dto.OnlyOfficeCallbackRequest;
import com.wess.pilot.service.FormTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.Valid;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/form-templates")
@RequiredArgsConstructor
@Validated
public class FormTemplateController {

    private final FormTemplateService formTemplateService;

    /** 목록 조회 (year/semester 필터 선택) */
    @GetMapping
    public List<FormTemplateDto> list(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String semester) {
        return formTemplateService.findAll(year, semester);
    }

    /** 단건 조회 */
    @GetMapping("/{id}")
    public FormTemplateDto get(@PathVariable Long id) {
        return formTemplateService.findById(id);
    }

    /** 생성 */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FormTemplateDto create(@Valid @RequestBody FormTemplateCreateRequest request) {
        return formTemplateService.create(request);
    }

    /** 메타데이터 수정 (이름·교과목·필드 등) */
    @PutMapping("/{id}")
    public FormTemplateDto update(@PathVariable Long id,
                                  @RequestBody FormTemplateCreateRequest request) {
        return formTemplateService.update(id, request);
    }

    /** 삭제 (DB + MinIO 파일) */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        formTemplateService.delete(id);
    }

    /** docx 파일 직접 업로드 */
    @PostMapping("/{id}/file")
    public FormTemplateDto uploadFile(@PathVariable Long id,
                                      @RequestParam("file") MultipartFile file) throws IOException {
        return formTemplateService.uploadTemplateFile(id, file);
    }

    /**
     * OnlyOffice 에디터가 문서를 다운로드하는 엔드포인트.
     * SecurityConfig 에서 인증 없이 허용(OnlyOffice 컨테이너가 호출하므로 토큰 없음).
     */
    @GetMapping("/{id}/file")
    public ResponseEntity<byte[]> file(@PathVariable Long id) throws IOException {
        FileContent fc = formTemplateService.getFile(id);
        String encodedName = java.net.URLEncoder.encode(fc.getFileName(), StandardCharsets.UTF_8)
                .replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(fc.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(encodedName, StandardCharsets.UTF_8).build().toString())
                .body(fc.getBytes());
    }

    /**
     * OnlyOffice 저장 콜백 수신.
     * SecurityConfig 에서 인증 없이 허용.
     */
    @PostMapping("/{id}/callback")
    public Map<String, Object> callback(@PathVariable Long id,
                                        @RequestBody OnlyOfficeCallbackRequest callback) {
        return formTemplateService.handleCallback(id, callback);
    }

    /**
     * 관리자가 OnlyOffice 에디터로 템플릿을 열기 위한 설정 조회.
     * 파일이 없으면 fields 기반 DOCX를 자동 생성 후 반환.
     */
    @GetMapping("/{id}/editor-config")
    public FormTemplateDto editorConfig(@PathVariable Long id) {
        return formTemplateService.getEditorConfig(id);
    }

    /**
     * fields 정의를 기반으로 표 형식 DOCX를 자동 생성하여 MinIO에 저장.
     * 이후 OnlyOffice로 열어 레이아웃을 수정할 수 있다.
     */
    @PostMapping("/{id}/generate-docx")
    public FormTemplateDto generateDocx(@PathVariable Long id) {
        return formTemplateService.generateDocx(id);
    }
}
