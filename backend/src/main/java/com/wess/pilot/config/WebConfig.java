package com.wess.pilot.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 트레일링 슬래시 매칭 비활성화. 기본값(true)에서는 /api/journals/1/file/ 가
 * /api/journals/1/file 핸들러에 매칭되어 permitAll 정확경로를 우회한다(F5). false 로 두면
 * 트레일링 슬래시 변형은 404 가 되어 우회 경로가 사라진다.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.setUseTrailingSlashMatch(false);
    }
}
