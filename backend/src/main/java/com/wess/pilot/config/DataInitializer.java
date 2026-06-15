package com.wess.pilot.config;

import com.wess.pilot.domain.Account;
import com.wess.pilot.domain.Role;
import com.wess.pilot.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * 최초 구동 시 로그인 계정이 하나도 없으면 기본 관리자/지도자 계정을 생성한다.
 * 학생 계정은 관리자 화면(계정/배정 관리)에서 생성한다.
 *
 * 기본 계정 (반드시 운영 환경에서 비밀번호 변경 권장):
 *  - 관리자:  admin / admin1234
 *  - 지도자:  supervisor1 / supervisor1234
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        createIfMissing("admin", "admin1234", "관리자", Role.ADMIN);
        createIfMissing("supervisor1", "supervisor1234", "김지은 교수", Role.SUPERVISOR);
    }

    private void createIfMissing(String loginId, String rawPassword, String name, Role role) {
        if (accountRepository.existsByLoginId(loginId)) {
            return;
        }
        Account account = new Account();
        account.setLoginId(loginId);
        account.setPasswordHash(passwordEncoder.encode(rawPassword));
        account.setName(name);
        account.setRole(role);
        account.setCreatedDate(LocalDate.now());
        accountRepository.save(account);
    }
}
