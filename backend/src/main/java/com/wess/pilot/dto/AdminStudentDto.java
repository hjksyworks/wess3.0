package com.wess.pilot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AdminStudentDto {
    private Long id;
    private String name;
    private String major;
    private Integer year;
    /** 0~100 */
    private int completionRate;
}
