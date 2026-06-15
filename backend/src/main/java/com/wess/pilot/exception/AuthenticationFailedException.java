package com.wess.pilot.exception;

/** 로그인 실패 (아이디 없음 / 비밀번호 불일치) */
public class AuthenticationFailedException extends RuntimeException {
    public AuthenticationFailedException(String message) {
        super(message);
    }
}
