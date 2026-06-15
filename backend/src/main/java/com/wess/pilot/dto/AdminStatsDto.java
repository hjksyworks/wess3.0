package com.wess.pilot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatsDto {
    private long totalStudents;
    /** 0~100 */
    private int completionRate;
    private long formTemplateCount;
    private long totalJournals;
}
