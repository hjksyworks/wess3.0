package com.wess.pilot.controller;

import com.wess.pilot.dto.FormTemplateCreateRequest;
import com.wess.pilot.dto.FormTemplateDto;
import com.wess.pilot.service.FormTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.Valid;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/form-templates")
@RequiredArgsConstructor
@Validated
public class FormTemplateController {

    private final FormTemplateService formTemplateService;

    @GetMapping
    public List<FormTemplateDto> list(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String semester) {
        return formTemplateService.findAll(year, semester);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FormTemplateDto create(@Valid @RequestBody FormTemplateCreateRequest request) {
        return formTemplateService.create(request);
    }

    /** docx 양식 템플릿 파일 업로드 (선택 첨부) */
    @PostMapping("/{id}/file")
    public FormTemplateDto uploadFile(@PathVariable Long id, @RequestParam("file") MultipartFile file)
            throws IOException {
        return formTemplateService.uploadTemplateFile(id, file);
    }
}
