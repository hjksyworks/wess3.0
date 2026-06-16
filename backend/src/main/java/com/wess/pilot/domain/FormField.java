package com.wess.pilot.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * FormTemplate.fields(JSON) 의 항목 하나.
 * journal.content 의 key 로 사용되는 필드 정의 (key/label/type/saveToDb).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FormField {
    /** journal.content 의 key (예: "tasks") */
    private String key;
    /** 화면에 표시되는 항목명 (예: "주요 수행 업무") */
    private String label;
    /** text | textarea | date | combo | checkbox */
    private String type;
    /**
     * 학생이 최종 제출 시 이 필드 값을 journals.content(DB)에 저장할지 여부.
     * true 면 OnlyOffice 폼 필드 태그(w:tag)가 key 와 일치해야 업로드 검증 통과.
     */
    private boolean saveToDb = true;

    /** 학생이 수정 불가(읽기 전용) 여부. 기본 false */
    private boolean readOnly = false;

    /** 가로 너비 % (10~100). 누적 합이 100 초과 시 DOCX에서 새 행으로 분기. 기본 100 */
    private int width = 100;

    /** 셀 높이 pt. textarea 계열에 주로 사용. 기본 40 */
    private int height = 40;
}
