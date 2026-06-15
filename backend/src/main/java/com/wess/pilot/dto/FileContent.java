package com.wess.pilot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** 스트리밍 응답용 파일 데이터 (바이트 + 메타데이터) */
@Getter
@AllArgsConstructor
public class FileContent {
    private final byte[] bytes;
    private final String fileName;
    private final String contentType;
}
