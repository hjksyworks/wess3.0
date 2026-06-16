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
            dto.setDocumentUrl(base + "/api/form-templates/" + dto.getId() + "/file");
            dto.setCallbackUrl(base + "/api/form-templates/" + dto.getId() + "/callback");
        } else {
            dto.setDocumentUrl("/api/form-templates/" + dto.getId() + "/file");
            dto.setCallbackUrl("/api/form-templates/" + dto.getId() + "/callback");
        }
    }

    // ─── 파일 스트리밍 (OnlyOffice → GET /file) ────────────────────────────────

    @Transactional(readOnly = true)
    public FileContent getFile(Long id) throws IOException {
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
    public Map<String, Object> handleCallback(Long id, OnlyOfficeCallbackRequest callback) {
        Map<String, Object> response = new LinkedHashMap<>();
        FormTemplate template = formTemplateRepository.findById(id).orElse(null);
        if (template == null) {
            response.put("error", 1);
            return response;
        }

        Integer status = callback.getStatus();
        // 2: 문서 저장 완료, 6: 강제 저장
        if (status != null && (status == 2 || status == 6) && callback.getUrl() != null) {
            try {
                byte[] content = restTemplate.getForObject(callback.getUrl(), byte[].class);
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
}
