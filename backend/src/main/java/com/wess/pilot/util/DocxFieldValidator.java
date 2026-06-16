package com.wess.pilot.util;

import com.wess.pilot.domain.FormField;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * 업로드된 DOCX 파일의 OnlyOffice 폼 필드 태그(w:tag)를
 * FormTemplate 의 saveToDb=true 필드 key 와 비교해 정합성을 검증한다.
 *
 * <p>OnlyOffice 에서 삽입한 폼 필드(Content Control)는 OOXML 상
 * &lt;w:sdt&gt;&lt;w:sdtPr&gt;&lt;w:tag w:val="fieldKey"/&gt; 형태로 저장된다.
 */
public class DocxFieldValidator {

    private DocxFieldValidator() {}

    /**
     * @param docxBytes  업로드된 DOCX 바이트
     * @param fields     FormTemplate 에 정의된 전체 필드 목록
     * @return saveToDb=true 이지만 DOCX 안에 태그가 없는 key 목록 (비어있으면 검증 통과)
     */
    public static List<String> findMissingKeys(byte[] docxBytes, List<FormField> fields) {
        if (fields == null || fields.isEmpty()) return List.of();

        Set<String> requiredKeys = fields.stream()
                .filter(FormField::isSaveToDb)
                .map(FormField::getKey)
                .collect(Collectors.toSet());

        if (requiredKeys.isEmpty()) return List.of();

        Set<String> foundTags = extractTags(docxBytes);

        List<String> missing = new ArrayList<>();
        for (String key : requiredKeys) {
            if (!foundTags.contains(key)) {
                missing.add(key);
            }
        }
        return missing;
    }

    /**
     * DOCX(ZIP) 에서 word/document.xml 을 꺼내
     * &lt;w:tag w:val="..."&gt; 의 val 값을 모두 추출한다.
     */
    private static Set<String> extractTags(byte[] docxBytes) {
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(docxBytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if ("word/document.xml".equals(entry.getName())) {
                    return parseTagsFromXml(zis);
                }
            }
        } catch (Exception e) {
            // 파싱 실패 시 빈 셋 반환 → 검증은 서비스에서 처리
        }
        return Set.of();
    }

    private static Set<String> parseTagsFromXml(InputStream is) throws Exception {
        var dbf = DocumentBuilderFactory.newInstance();
        dbf.setNamespaceAware(true);
        // XXE 방어
        dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        var doc = dbf.newDocumentBuilder().parse(is);

        var tagNodes = doc.getElementsByTagNameNS(
                "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "tag");

        Set<String> tags = new java.util.HashSet<>();
        for (int i = 0; i < tagNodes.getLength(); i++) {
            var node = tagNodes.item(i);
            var attr = node.getAttributes()
                    .getNamedItemNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "val");
            if (attr != null && !attr.getNodeValue().isBlank()) {
                tags.add(attr.getNodeValue().trim());
            }
        }
        return tags;
    }
}
