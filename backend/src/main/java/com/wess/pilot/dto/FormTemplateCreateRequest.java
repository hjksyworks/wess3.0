package com.wess.pilot.dto;

import com.wess.pilot.domain.FormField;
import lombok.Getter;
import lombok.Setter;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.util.List;

@Getter
@Setter
public class FormTemplateCreateRequest {

    @NotNull
    private Integer year;

    @NotBlank
    private String semester;

    @NotBlank
    private String subject;

    @NotBlank
    private String name;

    private List<FormField> fields;
}
