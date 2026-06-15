package com.wess.pilot.service;

import com.wess.pilot.domain.FormTemplate;
import com.wess.pilot.dto.FormTemplateCreateRequest;
import com.wess.pilot.dto.FormTemplateDto;
import com.wess.pilot.exception.ResourceNotFoundException;
import com.wess.pilot.repository.FormTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormTemplateService {

    private static final String DOCX_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private final FormTemplateRepository formTemplateRepository;
    private final StorageService storageService;

    @Transactional(readOnly = true)
    public List<FormTemplateDto> findAll(Integer year, String semester) {
        List<FormTemplate> templates;
        if (year != null && semester != null) {
            templates = formTemplateRepository.findByYearAndSemester(year, semester);
        } else {
            templates = formTemplateRepository.findAll();
        }
        return templates.stream().map(FormTemplateDto::from).collect(Collectors.toList());
    }

    @Transactional
    public FormTemplateDto create(FormTemplateCreateRequest request) {
        FormTemplate template = new FormTemplate();
        template.setYear(request.getYear());
        template.setSemester(request.getSemester());
        template.setSubject(request.getSubject());
        template.setName(request.getName());
        template.setFields(request.getFields() != null ? request.getFields() : new ArrayList<>());
        template.setCreatedDate(LocalDate.now());

        FormTemplate saved = formTemplateRepository.save(template);
        return FormTemplateDto.from(saved);
    }

    @Transactional
    public FormTemplateDto uploadTemplateFile(Long id, MultipartFile file) throws IOException {
        FormTemplate template = formTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("양식 템플릿을 찾을 수 없습니다. id=" + id));

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("업로드할 파일이 없습니다.");
        }

        String key = StorageService.templateKey(id);
        storageService.putObject(key, file.getBytes(), DOCX_CONTENT_TYPE);

        template.setTemplateFileKey(key);
        template.setTemplateFileName(file.getOriginalFilename());

        FormTemplate saved = formTemplateRepository.save(template);
        return FormTemplateDto.from(saved);
    }
}
