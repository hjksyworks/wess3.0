package com.wess.pilot.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "wess.storage")
@Getter
@Setter
public class StorageProperties {

    private String endpoint;
    private String accessKey;
    private String secretKey;
    private String bucket;
    private String region = "us-east-1";
}
