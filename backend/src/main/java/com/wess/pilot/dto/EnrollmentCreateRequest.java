package com.wess.pilot.dto;

import lombok.Getter;
import lombok.Setter;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Getter
@Setter
public class EnrollmentCreateRequest {

    @NotNull
    private Long studentId;

    @NotNull
    private Long formTemplateId;

    @NotNull
    private Integer year;

    @NotBlank
    private String semester;

    @NotBlank
    private String subject;

    private String practiceName;

    private String supervisorName;

    @NotNull
    private Integer totalWeeks;
}
