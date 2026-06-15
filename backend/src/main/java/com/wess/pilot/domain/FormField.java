package com.wess.pilot.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * FormTemplate.fields(JSON) 의 항목 하나.
 * journal.content 의 key 로 사용되는 필드 정의 (key/label/type).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FormField {
    /** journal.content 의 key (예: "tasks") */
    private String key;
    /** 화면에 표시되는 항목명 (예: "주요 수행 업무") */
    private String label;
    /** text | textarea | date */
    private String type;
}
