package com.wess.pilot.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "wess.onlyoffice")
@Getter
@Setter
public class OnlyOfficeProperties {

    /** OnlyOffice Document Server 내부 URL (예: http://onlyoffice-app) */
    private String internalDocumentServerUrl;

    /** 백엔드 자신의 내부 URL (OnlyOffice가 documentUrl/callbackUrl 로 호출할 주소, 예: http://springboot-app:8080) */
    private String internalBackendUrl;

    /** ConvertService 경로 (예: /ConvertService.ashx) */
    private String convertPath;
}
