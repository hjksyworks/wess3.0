package com.wess.pilot.service;

import com.wess.pilot.config.OnlyOfficeProperties;
import com.wess.pilot.domain.FormTemplate;
import com.wess.pilot.dto.FileContent;
import com.wess.pilot.dto.FormTemplateCreateRequest;
import com.wess.pilot.dto.FormTemplateDto;
import com.wess.pilot.dto.OnlyOfficeCallbackRequest;
import com.wess.pilot.exception.ResourceNotFoundException;
import com.wess.pilot.repository.FormTemplateRepository;
import com.wess.pilot.util.DocxFieldValidator;
import com.wess.pilot.util.TemplateDocxGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormTemplateService {

    static final String DOCX_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private final FormTemplateRepository formTemplateRepository;
    private final StorageService storageService;
    private final OnlyOfficeProperties onlyOfficeProperties;
    private final RestTemplate restTemplate;
    private final com.wess.pilot.security.LinkSigner linkSigner;

    // ─── 조회 ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<FormTemplateDto> findAll(Integer year, String semester) {
        List<FormTemplate> templates = (year != null && semester != null)
                ? formTemplateRepository.findByYearAndSemester(year, semester)
                : formTemplateRepository.findAll();
        return templates.stream().map(FormTemplateDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FormTemplateDto findById(Long id) {
        return FormTemplateDto.from(getOrThrow(id));
    }

    // ─── 생성 / 수정 / 삭제 ────────────────────────────────────────────────────

    @Transactional
    public FormTemplateDto create(FormTemplateCreateRequest request) {
        FormTemplate template = new FormTemplate();
        template.setYear(request.getYear());
        template.setSemester(request.getSemester());
        template.setSubject(request.getSubject());
        template.setName(request.getName());
        template.setFields(request.getFields() != null ? request.getFields() : new ArrayList<>());
        template.setCadence("DAILY".equalsIgnoreCase(request.getCadence())
                ? com.wess.pilot.domain.JournalCadence.DAILY : com.wess.pilot.domain.JournalCadence.WEEKLY);
        template.setCreatedDate(LocalDate.now());
        return FormTemplateDto.from(formTemplateRepository.save(template));
    }

    @Transactional
    public FormTemplateDto update(Long id, FormTemplateCreateRequest request) {
        FormTemplate template = getOrThrow(id);
        if (request.getYear() != null) template.setYear(request.getYear());
        if (request.getSemester() != null && !request.getSemester().isBlank())
            template.setSemester(request.getSemester());
        if (request.getSubject() != null && !request.getSubject().isBlank())
            template.setSubject(request.getSubject());
        if (request.getName() != null && !request.getName().isBlank())
            template.setName(request.getName());
        if (request.getFields() != null)
            template.setFields(request.getFields());
        return FormTemplateDto.from(formTemplateRepository.save(template));
    }

    @Transactional
    public void delete(Long id) {
        FormTemplate template = getOrThrow(id);
        String fileKey = template.getTemplateFileKey();
        formTemplateRepository.delete(template);
        if (fileKey != null && storageService.exists(fileKey)) {
            storageService.deleteObject(fileKey);
        }
    }

    // ─── 파일 업로드 (관리자가 직접 docx 첨부) ─────────────────────────────────

    @Transactional
    public FormTemplateDto uploadTemplateFile(Long id, MultipartFile file) throws IOException {
        FormTemplate template = getOrThrow(id);
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("업로드할 파일이 없습니다.");
        }

        byte[] bytes = file.getBytes();

        // saveToDb=true 필드 key 가 DOCX 폼 필드 태그에 모두 있는지 검증
        List<String> missingKeys = DocxFieldValidator.findMissingKeys(bytes, template.getFields());
        if (!missingKeys.isEmpty()) {
            // 누락된 key 에 해당하는 label 도 함께 반환
            List<String> labels = template.getFields().stream()
                    .filter(f -> f.isSaveToDb() && missingKeys.contains(f.getKey()))
                    .map(f -> f.getLabel() + " (key: " + f.getKey() + ")")
                    .collect(java.util.stream.Collectors.toList());
            throw new IllegalArgumentException(
                    "DOCX 정합성 오류 — 아래 필드의 폼 태그(w:tag)가 없습니다:\n"
                    + String.join(", ", labels));
        }

        String key = StorageService.templateKey(id);
        storageService.putObject(key, bytes, DOCX_CONTENT_TYPE);
        template.setTemplateFileKey(key);
        template.setTemplateFileName(file.getOriginalFilename());
        template.touchFile();
        return FormTemplateDto.from(formTemplateRepository.save(template));
    }

    // ─── DOCX 자동 생성 (fields 기반) ──────────────────────────────────────────

    @Transactional
    public FormTemplateDto generateDocx(Long id) {
        FormTemplate template = getOrThrow(id);
        byte[] docx = TemplateDocxGenerator.generate(template.getName(), template.getFields());
        String key = StorageService.templateKey(id);
        storageService.putObject(key, docx, DOCX_CONTENT_TYPE);
        template.setTemplateFileKey(key);
        if (template.getTemplateFileName() == null || template.getTemplateFileName().isBlank()) {
            template.setTemplateFileName("template.docx");
        }
        template.touchFile();
        return FormTemplateDto.from(formTemplateRepository.save(template));
    }

    // ─── OnlyOffice 에디터 설정 ────────────────────────────────────────────────

    /**
     * 관리자가 OnlyOffice 에디터로 템플릿을 열기 위한 설정 반환.
     * 파일이 없으면 먼저 DOCX를 자동 생성한다.
     */
    @Transactional
    public FormTemplateDto getEditorConfig(Long id) {
        FormTemplate template = getOrThrow(id);
        // 파일이 없으면 자동 생성
        if (template.getTemplateFileKey() == null
                || !storageService.exists(template.getTemplateFileKey())) {
            byte[] docx = TemplateDocxGenerator.generate(template.getName(), template.getFields());
            String key = StorageService.templateKey(id);
            storageService.putObject(key, docx, DOCX_CONTENT_TYPE);
            template.setTemplateFileKey(key);
            if (template.getTemplateFileName() == null || template.getTemplateFileName().isBlank()) {
                template.setTemplateFileName("template.docx");
            }
            template.touchFile();
            template = formTemplateRepository.save(template);
        }

        FormTemplateDto dto = FormTemplateDto.from(template);
        applyEditorUrls(dto);
        return dto;
    }

    /** OnlyOffice 컨테이너가 문서를 가져갈 내부 URL 주입 (자체서명 인증서 우회) */
    private void applyEditorUrls(FormTemplateDto dto) {
        String base = onlyOfficeProperties.getInternalBackendUrl();
        if (base != null && !base.isEmpty()) {
            String t = linkSigner.sign("template:" + dto.getId());
            dto.setDocumentUrl(base + "/api/form-templates/" + dto.getId() + "/file?t=" + t);
            dto.setCallbackUrl(base + "/api/form-templates/" + dto.getId() + "/callback?t=" + t);
        } else {
            dto.setDocumentUrl("/api/form-templates/" + dto.getId() + "/file");
            dto.setCallbackUrl("/api/form-templates/" + dto.getId() + "/callback");
        }
    }

    // ─── 파일 스트리밍 (OnlyOffice → GET /file) ────────────────────────────────

    @Transactional(readOnly = true)
    public FileContent getFile(Long id, String token) throws IOException {
        if (!linkSigner.verify("template:" + id, token)) {
            throw new org.springframework.security.access.AccessDeniedException("유효하지 않은 문서 링크입니다.");
        }
        FormTemplate template = getOrThrow(id);
        String fileName = template.getTemplateFileName() != null
                ? template.getTemplateFileName()
                : "template.docx";

        if (template.getTemplateFileKey() != null
                && storageService.exists(template.getTemplateFileKey())) {
            byte[] bytes = storageService.getObjectBytes(template.getTemplateFileKey());
            return new FileContent(bytes, fileName, DOCX_CONTENT_TYPE);
        }

        // 파일이 없으면 즉석에서 자동 생성하여 반환
        byte[] docx = TemplateDocxGenerator.generate(template.getName(), template.getFields());
        return new FileContent(docx, fileName, DOCX_CONTENT_TYPE);
    }

    // ─── OnlyOffice 저장 콜백 (POST /callback) ─────────────────────────────────

    @Transactional
    public Map<String, Object> handleCallback(Long id, String token, OnlyOfficeCallbackRequest callback) {
        Map<String, Object> response = new LinkedHashMap<>();
        if (!linkSigner.verify("template:" + id, token)) {
            response.put("error", 1);
            return response;
        }
        FormTemplate template = formTemplateRepository.findById(id).orElse(null);
        if (template == null) {
            response.put("error", 1);
            return response;
        }

        Integer status = callback.getStatus();
        // 2: 문서 저장 완료, 6: 강제 저장
        if (status != null && (status == 2 || status == 6) && callback.getUrl() != null) {
            try {
                // URI 오버로드 필수. String 오버로드는 URI 템플릿으로 보고 재인코딩하므로
                // OnlyOffice 콜백 URL의 한글 파일명(%EC..)이 %25EC.. 로 이중 인코딩되어
                // md5 서명 검증에 실패하고 403 -> 저장 실패(error:1)가 된다.
                byte[] content = restTemplate.getForObject(toInternalFileUri(callback.getUrl()), byte[].class);
                if (content != null) {
                    String key = StorageService.templateKey(id);
                    storageService.putObject(key, content, DOCX_CONTENT_TYPE);
                    template.setTemplateFileKey(key);
                    if (template.getTemplateFileName() == null
                            || template.getTemplateFileName().isBlank()) {
                        template.setTemplateFileName("template.docx");
                    }
                    template.touchFile();
                    formTemplateRepository.save(template);
                }
            } catch (Exception e) {
                response.put("error", 1);
                return response;
            }
        }

        response.put("error", 0);
        return response;
    }

    // ─── 헬퍼 ──────────────────────────────────────────────────────────────────

    private FormTemplate getOrThrow(Long id) {
        return formTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("양식 템플릿을 찾을 수 없습니다. id=" + id));
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

}
