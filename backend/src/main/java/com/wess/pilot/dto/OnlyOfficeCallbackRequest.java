package com.wess.pilot.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

/** OnlyOffice Document Server 가 callbackUrl 로 전송하는 저장 콜백 본문 (필요한 필드만 매핑) */
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class OnlyOfficeCallbackRequest {

    /** 1=편집중, 2=저장필요(MustSave), 3=오류, 4=종료(변경없음), 6=강제저장(MustForceSave), 7=강제저장 오류 */
    private Integer status;

    /** 편집된 문서를 다운로드할 수 있는 임시 URL (status 2/6 일 때 제공) */
    private String url;

    private String key;
}
