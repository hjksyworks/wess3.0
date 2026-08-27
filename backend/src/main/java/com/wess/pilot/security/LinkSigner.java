package com.wess.pilot.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * OnlyOffice 전용 파일/콜백 링크에 HMAC-SHA256 토큰을 부여·검증한다.
 * permitAll 인 /file·/callback 은 사용자 토큰이 없으므로(OnlyOffice 서버가 호출),
 * 백엔드가 발급한 이 링크 토큰이 없으면 접근을 거부해 내부망 무인증 접근/콜백 위조(F6·F7)를 막는다.
 */
@Component
public class LinkSigner {

    private final byte[] secret;

    public LinkSigner(@Value("${wess.jwt.secret}") String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String sign(String resource) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] h = mac.doFinal(resource.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(h.length * 2);
            for (byte b : h) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("링크 서명 실패", e);
        }
    }

    public boolean verify(String resource, String token) {
        if (token == null || token.isEmpty()) {
            return false;
        }
        String expected = sign(resource);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                token.getBytes(StandardCharsets.UTF_8));
    }
}
