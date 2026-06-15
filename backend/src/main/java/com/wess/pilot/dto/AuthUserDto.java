package com.wess.pilot.dto;

import com.wess.pilot.domain.Account;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 프론트엔드 AuthUser 와 매핑되는 로그인 사용자 정보 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AuthUserDto {
    private Long id;
    private String name;
    private String role;
    private Long studentId;

    public static AuthUserDto from(Account account) {
        return new AuthUserDto(
                account.getId(),
                account.getName(),
                account.getRole().name(),
                account.getStudent() != null ? account.getStudent().getId() : null);
    }
}
