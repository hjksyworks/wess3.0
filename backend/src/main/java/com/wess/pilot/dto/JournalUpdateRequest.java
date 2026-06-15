package com.wess.pilot.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Map;

/** PUT /api/journals/{id} 요청 본문. null 인 필드는 변경하지 않는다. */
@Getter
@Setter
public class JournalUpdateRequest {

    private Map<String, String> content;
    private LocalDate startDate;
    private LocalDate endDate;

    /** "WRITING" | "SUBMITTED" — 그 외 값은 무시 */
    private String status;
}
