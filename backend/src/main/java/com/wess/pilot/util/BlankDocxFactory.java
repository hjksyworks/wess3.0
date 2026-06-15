package com.wess.pilot.util;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * 학생/관리자가 첨부한 docx 템플릿이 없을 때 사용할 "빈 문서"를 즉석에서 생성한다.
 * Apache POI 등 외부 라이브러리 없이, 최소한의 OOXML(.docx) 구조를 직접 zip으로 작성한다.
 */
public final class BlankDocxFactory {

    private static final String CONTENT_TYPES =
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
            "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
            "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
            "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
            "<Override PartName=\"/word/document.xml\" " +
            "ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>" +
            "</Types>";

    private static final String RELS =
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
            "<Relationship Id=\"rId1\" " +
            "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" " +
            "Target=\"word/document.xml\"/>" +
            "</Relationships>";

    private static final String DOCUMENT =
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
            "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">" +
            "<w:body><w:p/></w:body>" +
            "</w:document>";

    private BlankDocxFactory() {
    }

    public static byte[] create() {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {
            writeEntry(zos, "[Content_Types].xml", CONTENT_TYPES);
            writeEntry(zos, "_rels/.rels", RELS);
            writeEntry(zos, "word/document.xml", DOCUMENT);
            zos.finish();
            return baos.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("빈 docx 생성에 실패했습니다.", e);
        }
    }

    private static void writeEntry(ZipOutputStream zos, String name, String content) throws IOException {
        zos.putNextEntry(new ZipEntry(name));
        zos.write(content.getBytes(StandardCharsets.UTF_8));
        zos.closeEntry();
    }
}
