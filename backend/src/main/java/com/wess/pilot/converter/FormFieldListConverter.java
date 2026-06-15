package com.wess.pilot.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wess.pilot.domain.FormField;

import javax.persistence.AttributeConverter;
import javax.persistence.Converter;
import java.util.Collections;
import java.util.List;

/** List&lt;FormField&gt; <-> JSON 문자열(TEXT 컬럼) 변환 */
@Converter
public class FormFieldListConverter implements AttributeConverter<List<FormField>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<FormField> attribute) {
        try {
            return MAPPER.writeValueAsString(attribute == null ? Collections.emptyList() : attribute);
        } catch (Exception e) {
            throw new IllegalStateException("FormField 목록 직렬화 실패", e);
        }
    }

    @Override
    public List<FormField> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            return MAPPER.readValue(dbData, new TypeReference<List<FormField>>() {
            });
        } catch (Exception e) {
            throw new IllegalStateException("FormField 목록 역직렬화 실패", e);
        }
    }
}
