package com.wess.pilot.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.persistence.AttributeConverter;
import javax.persistence.Converter;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** Map&lt;String,String&gt; (journal.content) <-> JSON 문자열(TEXT 컬럼) 변환 */
@Converter
public class StringMapConverter implements AttributeConverter<Map<String, String>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(Map<String, String> attribute) {
        try {
            return MAPPER.writeValueAsString(attribute == null ? Collections.emptyMap() : attribute);
        } catch (Exception e) {
            throw new IllegalStateException("content 맵 직렬화 실패", e);
        }
    }

    @Override
    public Map<String, String> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return new LinkedHashMap<>();
        }
        try {
            return MAPPER.readValue(dbData, new TypeReference<LinkedHashMap<String, String>>() {
            });
        } catch (Exception e) {
            throw new IllegalStateException("content 맵 역직렬화 실패", e);
        }
    }
}
