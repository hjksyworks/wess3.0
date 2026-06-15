package com.wess.pilot.config;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** MinIO(S3 호환) 접속용 AmazonS3 클라이언트 빈 */
@Configuration
@RequiredArgsConstructor
public class S3Config {

    private final StorageProperties storageProperties;

    @Bean
    public AmazonS3 amazonS3() {
        BasicAWSCredentials credentials = new BasicAWSCredentials(
                storageProperties.getAccessKey(),
                storageProperties.getSecretKey());

        return AmazonS3ClientBuilder.standard()
                .withEndpointConfiguration(new AwsClientBuilder.EndpointConfiguration(
                        storageProperties.getEndpoint(), storageProperties.getRegion()))
                .withCredentials(new AWSStaticCredentialsProvider(credentials))
                .withPathStyleAccessEnabled(true)
                .build();
    }
}
