package com.wess.pilot.dto;

import com.wess.pilot.domain.Enrollment;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentDto {

    private Long id;
    private Long studentId;
    private String studentName;
    private Integer year;
    private String semester;
    private String subject;
    private String practiceName;
    private String supervisorName;
    private Integer totalWeeks;
    private FormTemplateDto formTemplate;
    private LocalDate createdDate;

    public static EnrollmentDto from(Enrollment entity) {
        return new EnrollmentDto(
                entity.getId(),
                entity.getStudent().getId(),
                entity.getStudent().getName(),
                entity.getYear(),
                entity.getSemester(),
                entity.getSubject(),
                entity.getPracticeName(),
                entity.getSupervisorName(),
                entity.getTotalWeeks(),
                FormTemplateDto.from(entity.getFormTemplate()),
                entity.getCreatedDate());
    }
}
