package com.wess.pilot.domain;

import com.wess.pilot.converter.FormFieldListConverter;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.Column;
import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.LocalDate;
import java.util.List;

/** 연도/학기/교과목별 일지 양식 템플릿. JSON 작성항목(fields) + (선택) docx 템플릿 파일 */
@Entity
@Table(name = "form_templates")
@Getter
@Setter
@NoArgsConstructor
public class FormTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer year;

    /** "1" | "2" */
    @Column(nullable = false, length = 1)
    private String semester;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String name;

    /** 작성 항목 정의 (key/label/type 목록) */
    @Convert(converter = FormFieldListConverter.class)
    @Column(name = "fields", columnDefinition = "TEXT")
    private List<FormField> fields;

    /** MinIO 객체 경로 (예: templates/1/template.docx). 첨부 안 했으면 null */
    @Column(name = "template_file_key")
    private String templateFileKey;

    /** 업로드한 원본 docx 파일명 */
    @Column(name = "template_file_name")
    private String templateFileName;

    @Column(name = "created_date", nullable = false)
    private LocalDate createdDate;
}
