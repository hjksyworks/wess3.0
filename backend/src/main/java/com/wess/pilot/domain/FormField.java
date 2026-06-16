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
}
