package com.wess.pilot.security;

import com.wess.pilot.domain.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;

/** JWT 검증 후 SecurityContext 에 저장되는 인증 주체 정보 */
@Getter
@AllArgsConstructor
public class AuthPrincipal {
    private final Long accountId;
    private final String loginId;
    private final String name;
    private final Role role;
    /** STUDENT 계정인 경우에만 값이 있음 */
    private final Long studentId;
}
