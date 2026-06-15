package com.wess.pilot.dto;

import lombok.Getter;
import lombok.Setter;

import javax.validation.constraints.NotBlank;
import java.time.LocalDate;

@Getter
@Setter
public class FeedbackRequest {

    @NotBlank
    private String supervisorName;

    private LocalDate date;

    @NotBlank
    private String content;
}
