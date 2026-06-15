package com.wess.pilot.service;

import com.wess.pilot.domain.Account;
import com.wess.pilot.dto.AuthUserDto;
import com.wess.pilot.dto.LoginRequest;
import com.wess.pilot.dto.LoginResponse;
import com.wess.pilot.exception.AuthenticationFailedException;
import com.wess.pilot.repository.AccountRepository;
import com.wess.pilot.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        Account account = accountRepository.findByLoginId(request.getLoginId())
                .orElseThrow(() -> new AuthenticationFailedException("아이디 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new AuthenticationFailedException("아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        String token = jwtTokenProvider.createToken(account);
        return new LoginResponse(token, AuthUserDto.from(account));
    }

    @Transactional(readOnly = true)
    public AuthUserDto me(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AuthenticationFailedException("계정을 찾을 수 없습니다."));
        return AuthUserDto.from(account);
    }
}
