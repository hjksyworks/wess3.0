package com.wess.pilot.dto;

import com.wess.pilot.domain.Account;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AccountDto {

    private Long id;
    private String loginId;
    private String name;
    private String role;
    private Long studentId;
    private String studentName;
    private LocalDate createdDate;

    public static AccountDto from(Account account) {
        return new AccountDto(
                account.getId(),
                account.getLoginId(),
                account.getName(),
                account.getRole().name(),
                account.getStudent() != null ? account.getStudent().getId() : null,
                account.getStudent() != null ? account.getStudent().getName() : null,
                account.getCreatedDate());
    }
}
