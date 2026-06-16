package com.wess.pilot.dto;

import com.wess.pilot.domain.FormField;
import com.wess.pilot.domain.FormTemplate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class FormTemplateDto {

    private Long id;
    private Integer year;
    private String semester;
    private String subject;
    private String name;
    private List<FormField> fields;
    private String templateFileKey;
    private String templateFileName;
    private LocalDate createdDate;

    /** OnlyOffice 에디터 설정 — getEditorConfig() 호출 시 채워짐 */
    private String documentUrl;
    private String callbackUrl;
    private String documentKey;

    public static FormTemplateDto from(FormTemplate entity) {
        FormTemplateDto dto = new FormTemplateDto();
        dto.setId(entity.getId());
        dto.setYear(entity.getYear());
        dto.setSemester(entity.getSemester());
        dto.setSubject(entity.getSubject());
        dto.setName(entity.getName());
        dto.setFields(entity.getFields());
        dto.setTemplateFileKey(entity.getTemplateFileKey());
        dto.setTemplateFileName(entity.getTemplateFileName());
        dto.setCreatedDate(entity.getCreatedDate());
        long ts = entity.getUpdatedAt() != null ? entity.getUpdatedAt().getEpochSecond() : 0L;
        dto.setDocumentKey("template-" + entity.getId() + "-" + ts);
        return dto;
    }
}
