package com.wess.pilot.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.AmazonS3Exception;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.util.IOUtils;
import com.wess.pilot.config.StorageProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * MinIO(S3 호환) 객체 스토리지 연동. 컨트롤러/다른 서비스는 MinIO를 직접 호출하지 않고
 * 이 서비스를 통해서만 파일을 업로드/다운로드한다 (MinIO 비공개 원칙).
 *
 * 객체 경로 규칙 (WESS_데모사이트_설계검토.md 7.2):
 *  - 양식 템플릿:  templates/{formTemplateId}/template.docx
 *  - 학생 일지:    {year}/{semester}/{subject}/student_{studentId}/week_{n}/log_file.docx
 */
@Service
@RequiredArgsConstructor
public class StorageService {

    private final AmazonS3 amazonS3;
    private final StorageProperties storageProperties;

    /**
     * 애플리케이션 시작 시 설정된 버킷이 없으면 생성한다.
     * (MinIO 볼륨이 초기화되거나 처음 배포되는 환경에서 버킷이 존재하지 않아
     * putObject 가 NoSuchBucket 으로 실패하는 문제를 방지)
     */
    @PostConstruct
    public void ensureBucketExists() {
        String bucket = storageProperties.getBucket();
        if (bucket == null || bucket.isEmpty()) {
            return;
        }
        if (!amazonS3.doesBucketExistV2(bucket)) {
            amazonS3.createBucket(bucket);
        }
    }

    public boolean exists(String key) {
        if (key == null) {
            return false;
        }
        try {
            return amazonS3.doesObjectExist(storageProperties.getBucket(), key);
        } catch (AmazonS3Exception e) {
            return false;
        }
    }

    /** 객체를 바이트 배열로 읽어온다. */
    public byte[] getObjectBytes(String key) throws IOException {
        S3Object s3Object = amazonS3.getObject(storageProperties.getBucket(), key);
        try (InputStream in = s3Object.getObjectContent()) {
            return IOUtils.toByteArray(in);
        }
    }

    /** 객체의 Content-Type (없으면 기본값) */
    public String getContentType(String key, String defaultType) {
        try {
            ObjectMetadata metadata = amazonS3.getObjectMetadata(storageProperties.getBucket(), key);
            String type = metadata.getContentType();
            return (type == null || type.isEmpty()) ? defaultType : type;
        } catch (AmazonS3Exception e) {
            return defaultType;
        }
    }

    public void putObject(String key, byte[] content, String contentType) {
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(content.length);
        metadata.setContentType(contentType);
        amazonS3.putObject(storageProperties.getBucket(), key, new ByteArrayInputStream(content), metadata);
    }

    /** 같은 버킷 내에서 객체를 복사한다 (양식 템플릿 docx -> 학생 일지 초기 파일). */
    public void copyObject(String sourceKey, String destinationKey) {
        amazonS3.copyObject(storageProperties.getBucket(), sourceKey, storageProperties.getBucket(), destinationKey);
    }

    public void deleteObject(String key) {
        amazonS3.deleteObject(storageProperties.getBucket(), key);
    }

    // ----- 경로 규칙 헬퍼 -----

    public static String templateKey(Long formTemplateId) {
        return "templates/" + formTemplateId + "/template.docx";
    }

    public static String journalKey(Integer year, String semester, String subject, Long studentId, Integer week) {
        return year + "/" + semester + "/" + subject + "/student_" + studentId + "/week_" + week + "/log_file.docx";
    }
}
