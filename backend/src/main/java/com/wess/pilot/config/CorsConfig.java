package com.wess.pilot.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 개발 단계 편의를 위한 CORS 허용 설정.
 * 운영 시에는 nginx가 동일 origin(/api)으로 프록시하므로 큰 영향은 없으나,
 * 프론트엔드를 별도 포트(vite dev server)에서 띄워 테스트할 때를 위해 허용한다.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
