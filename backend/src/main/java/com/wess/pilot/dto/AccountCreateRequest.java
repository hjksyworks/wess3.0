package com.wess.pilot.dto;

import lombok.Getter;
import lombok.Setter;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

/**
 * 관리자용 계정 생성 요청.
 *
 * role == STUDENT 인 경우:
 *  - studentId 를 지정하면 기존 학생에 계정을 연결한다.
 *  - studentId 가 없으면 name/major/studentYear 로 새 학생을 생성하고 계정을 연결한다.
 */
@Getter
@Setter
public class AccountCreateRequest {

    @NotBlank
    private String loginId;

    @NotBlank
    private String password;

    @NotBlank
    private String name;

    /** STUDENT | SUPERVISOR | ADMIN */
    @NotNull
    private String role;

    /** role == STUDENT 이고 기존 학생에 연결할 때 사용 */
    private Long studentId;

    /** role == STUDENT 이고 신규 학생을 생성할 때 사용 (선택) */
    private String major;

    /** role == STUDENT 이고 신규 학생을 생성할 때 사용 (선택, 학년 1~4) */
    private Integer studentYear;
}
