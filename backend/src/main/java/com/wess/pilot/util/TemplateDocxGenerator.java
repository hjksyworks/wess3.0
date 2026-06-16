package com.wess.pilot.util;

import com.wess.pilot.domain.FormField;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * FormTemplate.fields 정의를 바탕으로 표 형식의 DOCX 양식을 자동 생성한다.
 * Apache POI 없이 최소 OOXML 구조를 직접 생성하여 외부 의존성을 추가하지 않는다.
 *
 * 생성 구조:
 *  - 제목 단락 (굵게, 중앙 정렬)
 *  - 2열 표 (항목명 30% | 입력란 70%)
 *    - 헤더행: "항목" / "내용"  (회색 배경)
 *    - 각 필드행: label / 빈 칸 (textarea이면 3행으로 확대)
 */
public final class TemplateDocxGenerator {

    private TemplateDocxGenerator() {}

    public static byte[] generate(String title, List<FormField> fields) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {
            writeEntry(zos, "[Content_Types].xml", contentTypes());
            writeEntry(zos, "_rels/.rels", rels());
            writeEntry(zos, "word/_rels/document.xml.rels", wordRels());
            writeEntry(zos, "word/document.xml", document(title, fields));
            zos.finish();
            return baos.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("템플릿 DOCX 생성에 실패했습니다.", e);
        }
    }

    // ─── OOXML 부속 파일 ──────────────────────────────────────────────────────

    private static String contentTypes() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
                + "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>"
                + "<Default Extension=\"xml\" ContentType=\"application/xml\"/>"
                + "<Override PartName=\"/word/document.xml\""
                + " ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>"
                + "</Types>";
    }

    private static String rels() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
                + "<Relationship Id=\"rId1\""
                + " Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\""
                + " Target=\"word/document.xml\"/>"
                + "</Relationships>";
    }

    private static String wordRels() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"/>";
    }

    // ─── 본문 document.xml ────────────────────────────────────────────────────

    private static String document(String title, List<FormField> fields) {
        StringBuilder sb = new StringBuilder(2048);
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>");
        sb.append("<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">");
        sb.append("<w:body>");

        // 제목
        sb.append(titleParagraph(title));

        // 구분 여백
        sb.append("<w:p><w:pPr><w:spacing w:after=\"80\"/></w:pPr></w:p>");

        // 표
        sb.append("<w:tbl>");
        sb.append(tableProps());
        sb.append(headerRow());
        if (fields != null) {
            for (FormField f : fields) {
                boolean multiLine = "textarea".equals(f.getType());
                sb.append(dataRow(f.getLabel(), "", multiLine));
            }
        }
        sb.append("</w:tbl>");

        // 섹션 속성 (A4 여백)
        sb.append("<w:sectPr>");
        sb.append("<w:pgSz w:w=\"11906\" w:h=\"16838\"/>"); // A4
        sb.append("<w:pgMar w:top=\"1134\" w:right=\"850\" w:bottom=\"1134\" w:left=\"1134\""
                + " w:header=\"709\" w:footer=\"709\" w:gutter=\"0\"/>");
        sb.append("</w:sectPr>");

        sb.append("</w:body>");
        sb.append("</w:document>");
        return sb.toString();
    }

    private static String titleParagraph(String text) {
        return "<w:p>"
                + "<w:pPr>"
                + "<w:jc w:val=\"center\"/>"
                + "<w:spacing w:before=\"0\" w:after=\"160\"/>"
                + "</w:pPr>"
                + "<w:r>"
                + "<w:rPr><w:b/><w:sz w:val=\"32\"/><w:szCs w:val=\"32\"/></w:rPr>"
                + "<w:t>" + escapeXml(text) + "</w:t>"
                + "</w:r>"
                + "</w:p>";
    }

    private static String tableProps() {
        // 전체 너비(A4 본문 너비 약 9360 twips), 내부 border 포함
        return "<w:tblPr>"
                + "<w:tblW w:w=\"9360\" w:type=\"dxa\"/>"
                + "<w:tblBorders>"
                + border("top") + border("left") + border("bottom") + border("right")
                + border("insideH") + border("insideV")
                + "</w:tblBorders>"
                + "<w:tblLook w:val=\"04A0\" w:firstRow=\"1\" w:lastRow=\"0\""
                + " w:firstColumn=\"1\" w:lastColumn=\"0\" w:noHBand=\"0\" w:noVBand=\"1\"/>"
                + "</w:tblPr>";
    }

    private static String border(String side) {
        return "<w:" + side + " w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"9E9E9E\"/>";
    }

    private static String headerRow() {
        return "<w:tr>"
                + tc("2808", "C5CAE9", true, "항목")   // ~30% of 9360
                + tc("6552", "C5CAE9", true, "내용")   // ~70%
                + "</w:tr>";
    }

    private static String dataRow(String label, String value, boolean tall) {
        // tall row: trHeight 약 1200 twips (기본 약 400)
        String trPr = tall
                ? "<w:trPr><w:trHeight w:val=\"1200\" w:hRule=\"atLeast\"/></w:trPr>"
                : "";
        return "<w:tr>"
                + trPr
                + tc("2808", "EDE7F6", false, label)
                + tc("6552", null, false, value)
                + "</w:tr>";
    }

    /** 표 셀 하나를 생성한다 (너비 dxa, 배경색 hex 6자리 또는 null, 굵게 여부, 텍스트) */
    private static String tc(String widthDxa, String bgColor, boolean bold, String text) {
        StringBuilder sb = new StringBuilder();
        sb.append("<w:tc>");
        sb.append("<w:tcPr>");
        sb.append("<w:tcW w:w=\"").append(widthDxa).append("\" w:type=\"dxa\"/>");
        if (bgColor != null) {
            sb.append("<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"").append(bgColor).append("\"/>");
        }
        sb.append("<w:tcMar>");
        sb.append("<w:top w:w=\"80\" w:type=\"dxa\"/>");
        sb.append("<w:left w:w=\"120\" w:type=\"dxa\"/>");
        sb.append("<w:bottom w:w=\"80\" w:type=\"dxa\"/>");
        sb.append("<w:right w:w=\"120\" w:type=\"dxa\"/>");
        sb.append("</w:tcMar>");
        sb.append("</w:tcPr>");
        sb.append("<w:p>");
        sb.append("<w:pPr><w:spacing w:before=\"0\" w:after=\"0\"/></w:pPr>");
        sb.append("<w:r>");
        if (bold) {
            sb.append("<w:rPr><w:b/></w:rPr>");
        }
        sb.append("<w:t xml:space=\"preserve\">").append(escapeXml(text)).append("</w:t>");
        sb.append("</w:r>");
        sb.append("</w:p>");
        sb.append("</w:tc>");
        return sb.toString();
    }

    private static String escapeXml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    private static void writeEntry(ZipOutputStream zos, String name, String content) throws IOException {
        zos.putNextEntry(new ZipEntry(name));
        zos.write(content.getBytes(StandardCharsets.UTF_8));
        zos.closeEntry();
    }
}
