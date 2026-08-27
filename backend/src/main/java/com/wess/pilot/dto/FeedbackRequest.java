package com.wess.pilot.dto;

import lombok.Getter;
import lombok.Setter;

import javax.validation.constraints.NotBlank;
import java.time.LocalDate;

@Getter
@Setter
public class FeedbackRequest {

    /** 사용하지 않음 — 작성자명은 서버가 인증 주체에서 도출한다(사칭 차단). 하위호환용으로만 유지. */
    private String supervisorName;

    private LocalDate date;

    @NotBlank
    private String content;
}
