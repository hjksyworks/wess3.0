package com.wess.pilot.util;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfCopy;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.PdfWriter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * OnlyOffice ConvertService 로 변환된 일지 PDF 뒤에 지도자 피드백 페이지를 추가한다.
 *
 * 주의: OpenPDF 기본 폰트는 한글(CJK)을 지원하지 않는다. 운영 환경에서 한글 피드백을
 * 정상적으로 출력하려면 NanumGothic 등의 한글 TTF 폰트를 classpath(`fonts/`)에 추가하고
 * {@code BaseFont.createFont(...)} 로 임베드해야 한다. 폰트가 없는 경우에도 페이지 자체는
 * 정상적으로 추가되지만 한글 글리프는 출력되지 않을 수 있다.
 */
public final class PdfMergeUtil {

    private PdfMergeUtil() {
    }

    public static byte[] appendTextPage(byte[] basePdf, String title, String body) throws IOException {
        byte[] feedbackPdf = buildTextPdf(title, body);
        return mergePdfs(basePdf, feedbackPdf);
    }

    public static byte[] mergePdfs(byte[] first, byte[] second) throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfCopy copy = new PdfCopy(document, out);
            document.open();

            appendAllPages(copy, new PdfReader(first));
            appendAllPages(copy, new PdfReader(second));

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IOException("PDF 병합에 실패했습니다.", e);
        }
    }

    private static void appendAllPages(PdfCopy copy, PdfReader reader) throws Exception {
        int pages = reader.getNumberOfPages();
        for (int i = 1; i <= pages; i++) {
            copy.addPage(copy.getImportedPage(reader, i));
        }
        reader.close();
    }

    private static byte[] buildTextPdf(String title, String body) throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD);
            Font bodyFont = new Font(Font.HELVETICA, 11, Font.NORMAL);

            document.add(new Paragraph(title, titleFont));
            document.add(new Paragraph(" "));
            document.add(new Paragraph(body != null ? body : "", bodyFont));

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IOException("피드백 PDF 페이지 생성에 실패했습니다.", e);
        }
    }
}
