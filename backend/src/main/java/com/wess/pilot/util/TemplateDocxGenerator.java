package com.wess.pilot.util;

import com.wess.pilot.domain.FormField;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * FormTemplate.fields 정의를 바탕으로 표 형식의 DOCX 양식을 자동 생성한다.
 * Apache POI 없이 최소 OOXML 구조를 직접 생성.
 *
 * 생성 구조:
 *  - 제목 단락 (굵게, 중앙 정렬)
 *  - 단일 표 (Single Table)
 *    - 필드의 width% 누적이 100 초과 시 새 행으로 분기
 *    - readOnly=true  → 회색 배경 라벨 전용 셀 (입력 영역 없음)
 *    - readOnly=false → 회색 라벨 단락 + 흰 입력 단락 (height pt 적용)
 */
public final class TemplateDocxGenerator {

    private TemplateDocxGenerator() {}

    // A4 본문 너비 (좌우여백 제외, twips): 11906 - 1134 - 850 = 9922 → 9360으로 보정
    private static final int TABLE_WIDTH = 9360;
    // readOnly 셀 배경색 (회색)
    private static final String COLOR_LABEL = "D1D5DB";

    // ─── 진입점 ───────────────────────────────────────────────────────────────

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
        StringBuilder sb = new StringBuilder(4096);
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>");
        sb.append("<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">");
        sb.append("<w:body>");

        // 제목
        sb.append(titleParagraph(title));
        sb.append("<w:p><w:pPr><w:spacing w:after=\"80\"/></w:pPr></w:p>");

        // 필드가 있으면 단일 표 생성
        if (fields != null && !fields.isEmpty()) {
            List<List<FormField>> rows = groupIntoRows(fields);

            sb.append("<w:tbl>");
            sb.append(tableProps());
            for (List<FormField> row : rows) {
                sb.append(buildTableRow(row));
            }
            sb.append("</w:tbl>");
        }

        // 섹션 속성 (A4)
        sb.append("<w:sectPr>");
        sb.append("<w:pgSz w:w=\"11906\" w:h=\"16838\"/>");
        sb.append("<w:pgMar w:top=\"1134\" w:right=\"850\" w:bottom=\"1134\" w:left=\"1134\""
                + " w:header=\"709\" w:footer=\"709\" w:gutter=\"0\"/>");
        sb.append("</w:sectPr>");

        sb.append("</w:body></w:document>");
        return sb.toString();
    }

    // ─── 행 분기 ─────────────────────────────────────────────────────────────

    /**
     * 필드 목록을 width% 누적 기준으로 행 단위로 묶는다.
     * 누적이 100 초과 시 새 행으로 분리.
     */
    private static List<List<FormField>> groupIntoRows(List<FormField> fields) {
        List<List<FormField>> rows = new ArrayList<>();
        List<FormField> current = new ArrayList<>();
        int accumulated = 0;

        for (FormField f : fields) {
            int w = effectiveWidth(f);
            if (!current.isEmpty() && accumulated + w > 100) {
                rows.add(current);
                current = new ArrayList<>();
                accumulated = 0;
            }
            current.add(f);
            accumulated += w;
        }
        if (!current.isEmpty()) rows.add(current);
        return rows;
    }

    // ─── 표 행 생성 ──────────────────────────────────────────────────────────

    private static String buildTableRow(List<FormField> row) {
        // 행 내 width% 합계 (100이 안 될 수 있으므로 비율로 재계산)
        int totalPct = row.stream().mapToInt(TemplateDocxGenerator::effectiveWidth).sum();
        if (totalPct <= 0) totalPct = 100;

        // 행 최소 높이 결정
        // readOnly가 아닌 필드 중 최대 height 값을 행 높이로 사용
        int maxInputHeight = row.stream()
                .filter(f -> !f.isReadOnly())
                .mapToInt(f -> Math.max(effectiveHeight(f), 20))
                .max()
                .orElse(0);

        // 모두 readOnly면 라벨 높이만 (20pt = 400 twips), 아니면 입력 높이
        // pt → twips: 1pt = 20 twips
        int rowHeightTwips = maxInputHeight > 0
                ? maxInputHeight * 20
                : 400;

        StringBuilder sb = new StringBuilder();
        sb.append("<w:tr>");
        sb.append("<w:trPr>")
          .append("<w:trHeight w:val=\"").append(rowHeightTwips).append("\" w:hRule=\"atLeast\"/>")
          .append("</w:trPr>");

        for (FormField f : row) {
            int pct = effectiveWidth(f);
            int cellW = TABLE_WIDTH * pct / totalPct;

            if (f.isReadOnly()) {
                sb.append(readOnlyCell(cellW, f.getLabel()));
            } else {
                sb.append(inputCell(cellW, f.getLabel()));
            }
        }

        sb.append("</w:tr>");
        return sb.toString();
    }

    // ─── 셀 생성 ─────────────────────────────────────────────────────────────

    /**
     * readOnly 셀: 회색 배경, 라벨 텍스트만 (입력 영역 없음).
     * 서명란/헤더/고정값 표시용.
     */
    private static String readOnlyCell(int widthDxa, String label) {
        return "<w:tc>"
                + "<w:tcPr>"
                + "<w:tcW w:w=\"" + widthDxa + "\" w:type=\"dxa\"/>"
                + "<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"" + COLOR_LABEL + "\"/>"
                + tcMargins()
                + "</w:tcPr>"
                + "<w:p>"
                + "<w:pPr><w:spacing w:before=\"0\" w:after=\"0\"/></w:pPr>"
                + "<w:r>"
                + "<w:rPr><w:b/><w:sz w:val=\"20\"/><w:szCs w:val=\"20\"/></w:rPr>"
                + "<w:t xml:space=\"preserve\">" + escapeXml(label) + "</w:t>"
                + "</w:r>"
                + "</w:p>"
                + "</w:tc>";
    }

    /**
     * 입력 셀: 회색 라벨 단락 + 흰 입력 단락.
     * 행 높이(trHeight)로 입력 영역 크기가 결정된다.
     */
    private static String inputCell(int widthDxa, String label) {
        return "<w:tc>"
                + "<w:tcPr>"
                + "<w:tcW w:w=\"" + widthDxa + "\" w:type=\"dxa\"/>"
                + tcMargins()
                + "</w:tcPr>"
                // 라벨 단락 (회색 배경)
                + "<w:p>"
                + "<w:pPr>"
                + "<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"" + COLOR_LABEL + "\"/>"
                + "<w:spacing w:before=\"0\" w:after=\"60\"/>"
                + "</w:pPr>"
                + "<w:r>"
                + "<w:rPr><w:b/><w:sz w:val=\"18\"/><w:szCs w:val=\"18\"/></w:rPr>"
                + "<w:t xml:space=\"preserve\">" + escapeXml(label) + "</w:t>"
                + "</w:r>"
                + "</w:p>"
                // 입력 단락 (흰 배경, 행 높이로 확장)
                + "<w:p>"
                + "<w:pPr><w:spacing w:before=\"0\" w:after=\"0\"/></w:pPr>"
                + "</w:p>"
                + "</w:tc>";
    }

    // ─── 표 속성 ─────────────────────────────────────────────────────────────

    private static String tableProps() {
        return "<w:tblPr>"
                + "<w:tblW w:w=\"" + TABLE_WIDTH + "\" w:type=\"dxa\"/>"
                + "<w:tblBorders>"
                + border("top") + border("left") + border("bottom") + border("right")
                + border("insideH") + border("insideV")
                + "</w:tblBorders>"
                + "<w:tblCellMar>"
                + "<w:top w:w=\"0\" w:type=\"dxa\"/>"
                + "<w:left w:w=\"0\" w:type=\"dxa\"/>"
                + "<w:bottom w:w=\"0\" w:type=\"dxa\"/>"
                + "<w:right w:w=\"0\" w:type=\"dxa\"/>"
                + "</w:tblCellMar>"
                + "</w:tblPr>";
    }

    private static String border(String side) {
        return "<w:" + side + " w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"9E9E9E\"/>";
    }

    private static String tcMargins() {
        return "<w:tcMar>"
                + "<w:top w:w=\"60\" w:type=\"dxa\"/>"
                + "<w:left w:w=\"100\" w:type=\"dxa\"/>"
                + "<w:bottom w:w=\"60\" w:type=\"dxa\"/>"
                + "<w:right w:w=\"100\" w:type=\"dxa\"/>"
                + "</w:tcMar>";
    }

    // ─── 제목 단락 ───────────────────────────────────────────────────────────

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

    // ─── 헬퍼 ────────────────────────────────────────────────────────────────

    /** 유효 너비 % (0 또는 미설정이면 100으로 처리) */
    private static int effectiveWidth(FormField f) {
        return (f.getWidth() > 0) ? f.getWidth() : 100;
    }

    /** 유효 높이 pt (0 또는 미설정이면 40pt 처리) */
    private static int effectiveHeight(FormField f) {
        return (f.getHeight() > 0) ? f.getHeight() : 40;
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
