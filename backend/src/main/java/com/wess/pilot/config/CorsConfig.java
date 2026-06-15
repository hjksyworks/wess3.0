package com.wess.pilot.config;

/**
 * CORS 설정은 Spring Security 도입 이후 {@code security.SecurityConfig}의
 * CorsConfigurationSource 에서 일괄 처리한다 (중복 헤더 방지를 위해 이 클래스는
 * 더 이상 Bean을 등록하지 않는다).
 */
final class CorsConfig {
    private CorsConfig() {
    }
}
