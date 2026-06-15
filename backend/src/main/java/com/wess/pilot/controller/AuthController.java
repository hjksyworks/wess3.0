package com.wess.pilot.controller;

import com.wess.pilot.dto.AuthUserDto;
import com.wess.pilot.dto.LoginRequest;
import com.wess.pilot.dto.LoginResponse;
import com.wess.pilot.security.AuthPrincipal;
import com.wess.pilot.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /** 토큰이 유효한지 + 현재 로그인한 사용자 정보 확인용 */
    @GetMapping("/me")
    public AuthUserDto me(@AuthenticationPrincipal AuthPrincipal principal) {
        return authService.me(principal.getAccountId());
    }
}
