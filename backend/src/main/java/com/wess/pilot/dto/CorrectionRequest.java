package com.wess.pilot.dto;

import lombok.Getter;
import lombok.Setter;
import javax.validation.constraints.NotBlank;

/** 교수 정정요청 본문 — 사유 필수 */
@Getter
@Setter
public class CorrectionRequest {
    @NotBlank
    private String reason;
}
