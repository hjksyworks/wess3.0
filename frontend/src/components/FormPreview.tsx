import * as React from "react";
import type { FormField } from "@/types";

/**
 * 필드 정의로부터 실제 생성될 DOCX 양식의 모양을 미리 보여준다.
 * 계산식은 backend/util/TemplateDocxGenerator 와 동일하게 맞춘다.
 *  - rowGroup("행번호-셀순서")로 같은 행 배치, 셀순서로 좌→우 정렬
 *  - rowGroup 없는 필드는 각각 단독 행으로, 그룹 행들 뒤에 배치
 *  - 행 안에서 pairPct = width / (행 width 합), labelPct = pairPct * labelWidth%
 *  - 행 높이 = 행 내 최대 height(pt)
 */
const TYPE_HINT: Record<string, string> = {
  text: "텍스트 입력",
  textarea: "여러 줄 입력",
  date: "날짜 선택",
  combo: "목록에서 선택",
  checkbox: "체크",
};

const effWidth = (f: FormField) => (f.width && f.width > 0 ? f.width : 100);
const effHeight = (f: FormField) => (f.height && f.height > 0 ? f.height : 40);
const effLabelWidth = (f: FormField) => {
  const lw = f.labelWidth ?? 0;
  return lw > 0 && lw < 100 ? lw : 30;
};
const rowNum = (rg: string) => {
  const i = rg.indexOf("-");
  return i > 0 ? rg.slice(0, i).trim() : rg.trim();
};
const cellOrder = (rg?: string | null) => {
  if (!rg) return 0;
  const i = rg.indexOf("-");
  if (i < 0 || i >= rg.length - 1) return 0;
  const n = Number(rg.slice(i + 1).trim());
  return Number.isFinite(n) ? n : 0;
};

function groupIntoRows(fields: FormField[]): FormField[][] {
  const grouped = new Map<string, FormField[]>();
  const ungrouped: FormField[][] = [];
  for (const f of fields) {
    const rg = (f.rowGroup ?? "").trim();
    if (rg) {
      const key = rowNum(rg);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(f);
    } else {
      ungrouped.push([f]);
    }
  }
  const rows: FormField[][] = [];
  for (const row of grouped.values()) {
    rows.push([...row].sort((a, b) => cellOrder(a.rowGroup) - cellOrder(b.rowGroup)));
  }
  rows.push(...ungrouped);
  return rows;
}

export function FormPreview({ title, fields }: { title: string; fields: FormField[] }) {
  const valid = (fields ?? []).filter((f) => (f.label ?? "").trim() || (f.key ?? "").trim());
  const rows = React.useMemo(() => groupIntoRows(valid), [valid]);

  // 실제 표 폭 = 9360 twips = 468pt = 6.5in → 96dpi 기준 624px.
  // 세로(pt→px)는 1:1로 그리므로, 가로도 같은 배율로 고정해야 실제 문서와 비율이 맞는다.
  const PAGE_W = 624;

  return (
    <div className="rounded border border-slate-200 bg-white p-4 overflow-x-auto">
      {/* A4 본문 폭(6.5in) 기준으로 고정 — 실제 DOCX와 가로:세로 비율 일치 */}
      <div className="mx-auto" style={{ width: PAGE_W }}>
      <p className="text-center text-sm font-bold mb-3">{title?.trim() || "(양식명)"}</p>
      {rows.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-6">항목을 추가하면 양식 모양이 여기에 표시됩니다.</p>
      ) : (
        <table className="w-full border-collapse table-fixed">
          <tbody>
            {rows.map((row, ri) => {
              const totalPct = row.reduce((s, f) => s + effWidth(f), 0) || 100;
              const hPt = Math.max(...row.map((f) => Math.max(effHeight(f), 20)));
              const hPx = Math.round(hPt * 1.333);
              return (
                <tr key={ri} style={{ height: hPx }}>
                  {row.map((f, ci) => {
                    const pairPct = (effWidth(f) / totalPct) * 100;
                    const lw = effLabelWidth(f);
                    const labelPct = (pairPct * lw) / 100;
                    const inputPct = pairPct - labelPct;
                    return (
                      <React.Fragment key={ci}>
                        <td
                          className="border border-slate-300 bg-slate-200 px-2 py-1 align-middle text-[11px] font-medium text-slate-700 break-words"
                          style={{ width: `${labelPct}%` }}
                        >
                          {(f.label ?? "").trim() || <span className="text-slate-400">(항목명)</span>}
                        </td>
                        <td
                          className={`border border-slate-300 px-2 py-1 align-top text-[11px] ${
                            f.readOnly ? "bg-slate-50 text-slate-400" : "bg-white text-slate-400"
                          }`}
                          style={{ width: `${inputPct}%` }}
                        >
                          {f.readOnly ? "조회 전용" : TYPE_HINT[f.type] ?? "입력"}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        회색 = 라벨셀(편집 불가) · 흰색 = 학생 입력셀 · A4 본문 폭(6.5in) 기준 실제 비율 · 글꼴·여백은 다소 차이가 있을 수 있습니다.
      </p>
      </div>
    </div>
  );
}
