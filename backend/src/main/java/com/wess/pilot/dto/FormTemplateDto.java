package com.wess.pilot.dto;

import com.wess.pilot.domain.FormField;
import com.wess.pilot.domain.FormTemplate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
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

    public static FormTemplateDto from(FormTemplate entity) {
        return new FormTemplateDto(
                entity.getId(),
                entity.getYear(),
                entity.getSemester(),
                entity.getSubject(),
                entity.getName(),
                entity.getFields(),
                entity.getTemplateFileKey(),
                entity.getTemplateFileName(),
                entity.getCreatedDate());
    }
}
