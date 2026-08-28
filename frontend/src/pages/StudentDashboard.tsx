import * as React from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { OnlyOfficeEditor } from "@/components/OnlyOfficeEditor";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { mockEnrollment, mockFeedbacks, buildMockJournals } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";
import type { Enrollment, Feedback, Journal, JournalStatus } from "@/types";
import { CalendarDays, ChevronLeft, ChevronRight, MessageSquare, Maximize2, Minimize2, X } from "lucide-react";

const statusLabel: Record<JournalStatus, string> = {
  WRITING: "미작성",
  SUBMITTED: "작성완료",
  REVIEWED: "작성완료",
  MODIFIED: "작성완료",
  CORRECTION_REQUESTED: "정정요청",
};

type Kind = "none" | "draft" | "sub" | "rev" | "mod" | "corr";
const kindStyle: Record<Kind, { bg: string; fg: string; label: string }> = {
  none: { bg: "bg-slate-50", fg: "text-slate-400", label: "미작성" },
  draft: { bg: "bg-amber-50", fg: "text-amber-700", label: "작성중" },
  sub: { bg: "bg-blue-50", fg: "text-blue-700", label: "작성완료" },
  rev: { bg: "bg-green-50", fg: "text-green-700", label: "검토완료" },
  mod: { bg: "bg-purple-50", fg: "text-purple-700", label: "수정저장" },
  corr: { bg: "bg-red-50", fg: "text-red-700", label: "정정요청" },
};
function kindOf(j: Journal): Kind {
  if (j.status === "CORRECTION_REQUESTED") return "corr";
  if (j.status === "SUBMITTED" || j.status === "REVIEWED" || j.status === "MODIFIED") return "sub";
  const hasContent = Object.values(j.content ?? {}).some((v) => v && v.trim().length > 0);
  if (j.writtenDate || hasContent) return "draft";
  return "none";
}

const dowLabels = ["일", "월", "화", "수", "목", "금", "토"];
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseYmd = (str: string) => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = React.useState<Enrollment | null>(null);
  const [journals, setJournals] = React.useState<Journal[]>([]);
  const [feedbacks, setFeedbacks] = React.useState<Record<number, Feedback>>({});
  const [loading, setLoading] = React.useState(true);

  const [writeId, setWriteId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);
  // 편집 세션 동안 OnlyOffice 설정을 고정(열 때 스냅샷). 저장 후 목록 갱신이 편집기를 리로드시키지 않도록.
  // 편집기 미저장 여부(onDocumentStateChange). everDirty=이번 세션에서 한 번이라도 입력했는지
  const [dirty, setDirty] = React.useState(false);
  const dirtyRef = React.useRef(false);      // popstate 핸들러에서 최신값 읽기용
  const everDirty = React.useRef(false);
  const bypassGuard = React.useRef(false);   // 닫기 버튼에서 이미 확인받은 경우 재확인 skip
  const savedInSession = React.useRef(false); // 이번 편집 세션에서 저장 버튼을 눌렀는지
  // 편집기 표시 방식: 기본은 페이지 안 인라인, 최대화 시 전체창
  const [expanded, setExpanded] = React.useState<boolean>(() => {
    try { return localStorage.getItem("wess_editor_expanded") === "1"; } catch { return false; }
  });
  function toggleExpanded() {
    setExpanded((v) => {
      const nv = !v;
      try { localStorage.setItem("wess_editor_expanded", nv ? "1" : "0"); } catch { /* ignore */ }
      return nv;
    });
  }
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [editorCfg, setEditorCfg] = React.useState<{
    documentUrl: string; documentKey: string; title: string; mode: "edit" | "view"; callbackUrl: string;
  } | null>(null);
  const [calMonth, setCalMonth] = React.useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const monthInit = React.useRef(false);
  const [weekStart, setWeekStart] = React.useState<number>(() => {
    try { return localStorage.getItem("wess_week_start") === "1" ? 1 : 0; } catch { return 0; }
  });
  function changeWeekStart(v: number) {
    setWeekStart(v);
    try { localStorage.setItem("wess_week_start", String(v)); } catch { /* ignore */ }
  }

  React.useEffect(() => {
    (async () => {
      try {
        const enrRes = await api.get("/enrollments/me");
        const enr = enrRes.data as Enrollment;
        const jRes = await api.get("/journals", { params: { enrollmentId: enr.id } });
        const js = jRes.data as Journal[];
        setEnrollment(enr);
        setJournals(js);
        const fbMap: Record<number, Feedback> = {};
        await Promise.all(
          js.filter((j) => j.hasFeedback).map(async (j) => {
            try {
              const fbRes = await api.get(`/journals/${j.id}/feedback`);
              fbMap[j.id] = fbRes.data as Feedback;
            } catch {
              /* ignore */
            }
          }),
        );
        setFeedbacks(fbMap);
      } catch {
        setEnrollment(mockEnrollment);
        setJournals(buildMockJournals());
        setFeedbacks(mockFeedbacks);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cadence = journals.find((j) => j.cadence)?.cadence ?? "WEEKLY";
  const doneCount = journals.filter((j) => kindOf(j) === "sub").length;
  const draftCount = journals.filter((j) => kindOf(j) === "draft").length;
  const notCount = journals.filter((j) => kindOf(j) === "none").length;
  const corrCount = journals.filter((j) => kindOf(j) === "corr").length;

  const sortedJournals = [...journals].sort((a, b) => {
    if (a.entryDate && b.entryDate) return a.entryDate.localeCompare(b.entryDate);
    return a.week - b.week;
  });
  const practiceEnd = enrollment?.endDate ?? null;
  const pastDeadline = practiceEnd != null && ymd(new Date()) > practiceEnd;

  // 일별 달력의 기본 월: 오늘이 실습기간 밖이면 첫 일지가 있는 달로
  React.useEffect(() => {
    if (monthInit.current || cadence !== "DAILY") return;
    const dates = journals.filter((j) => j.entryDate).map((j) => j.entryDate as string).sort();
    if (dates.length === 0) return;
    monthInit.current = true;
    const today = ymd(new Date());
    const base = today < dates[0] ? parseYmd(dates[0]) : today > dates[dates.length - 1] ? parseYmd(dates[dates.length - 1]) : new Date();
    setCalMonth(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [journals, cadence]);

  // 편집기를 열 때 히스토리 엔트리를 하나 쌓아, 브라우저 백버튼이 앱을 벗어나지 않고
  // 편집기만 닫도록 한다(작성 중 이탈로 인한 내용 유실 방지).
  React.useEffect(() => {
    if (writeId == null) return;
    window.history.pushState({ wessEditor: true }, "");
    const onPop = () => {
      if (bypassGuard.current) {
        bypassGuard.current = false;
        setWriteId(null); setEditorCfg(null); setSaveMsg(null); setDirty(false); dirtyRef.current = false;
        return;
      }
      if (everDirty.current && !savedInSession.current) {
        const ok = window.confirm("작성한 내용을 저장하지 않았습니다. 저장하지 않고 나가시겠습니까?");
        if (!ok) {
          // 편집기를 유지하기 위해 엔트리를 다시 쌓는다
          window.history.pushState({ wessEditor: true }, "");
          return;
        }
      }
      setWriteId(null);
      setEditorCfg(null);
      setSaveMsg(null);
      setDirty(false);
      dirtyRef.current = false;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [writeId]);

  function openWrite(journal: Journal) {
    setWriteId(journal.id);
    setDraft({ ...journal.content });
    setSaveMsg(null);
    setDirty(false);
    dirtyRef.current = false;
    everDirty.current = false;
    bypassGuard.current = false;
    savedInSession.current = false;
    // 인라인 모드에서는 편집 영역이 화면 아래에 있을 수 있어 스크롤로 이동
    window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    setEditorCfg({
      documentUrl: journal.documentUrl ?? `${window.location.origin}${journal.fileUrl ?? `/api/journals/${journal.id}/file`}`,
      documentKey: journal.documentKey ?? `journal-${journal.id}-${journal.status}-${journal.submittedDate ?? journal.startDate ?? ""}`,
      title: journal.fileName ?? `${journal.week}주차_일지.docx`,
      mode: pastDeadline ? "view" : "edit",
      callbackUrl: journal.callbackUrl ?? `${window.location.origin}/api/journals/${journal.id}/callback`,
    });
  }
  function closeWrite() {
    if (everDirty.current && !savedInSession.current) {
      if (!window.confirm("작성한 내용을 저장하지 않았습니다. 저장하지 않고 나가시겠습니까?")) return;
      bypassGuard.current = true;   // popstate 에서 재확인하지 않도록
    }
    // popstate 핸들러가 상태를 정리한다(엔트리도 함께 소비).
    if (window.history.state?.wessEditor) {
      window.history.back();
      return;
    }
    setWriteId(null);
    setSaveMsg(null);
    setEditorCfg(null);
  }

  const currentJournal = journals.find((j) => j.id === writeId) ?? null;
  const isEditable = currentJournal != null && !pastDeadline;
  const editorDocKey = editorCfg?.documentKey ?? "";

  function extractError(e: unknown, fallback: string): string {
    const err = e as { response?: { data?: { message?: string } } };
    return err?.response?.data?.message ?? fallback;
  }

  async function refreshJournal(jid: number) {
    const before = journals.find((x) => x.id === jid);
    const initStatus = before?.status;
    const hadWritten = before?.writtenDate != null;
    for (let i = 0; i < 8; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1200));
      try {
        const res = await api.get(`/journals/${jid}`);
        const j = res.data as Journal;
        setJournals((prev) => prev.map((x) => (x.id === jid ? { ...x, ...j } : x)));
        // 초기 상태와 달라졌거나(정정요청->작성완료 등) writtenDate가 새로 붙으면 반영 완료
        const gotWritten = j.writtenDate != null && !hadWritten;
        if (j.status !== initStatus || gotWritten) return;
      } catch {
        /* retry */
      }
    }
  }

  async function saveDraft() {
    if (!currentJournal) return;
    // 편집기에서 한 번도 변경하지 않았으면 서버 왕복(forcesave error=4) 없이 즉시 안내
    if (!everDirty.current) {
      setSaveMsg(
        currentJournal.writtenDate
          ? "변경된 내용이 없습니다."
          : "입력된 내용이 없습니다. 내용을 작성한 뒤 저장해 주세요.",
      );
      return;
    }
    const jid = currentJournal.id;
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.put(`/journals/${jid}`, {
        content: draft,
        startDate: currentJournal.startDate,
        endDate: currentJournal.endDate,
      });
      const res = await api.post(`/journals/${jid}/forcesave`, { documentKey: editorDocKey });
      const saved = res.data as Journal;
      const hasContent =
        saved.writtenDate != null ||
        (saved.content != null && Object.values(saved.content).some((v) => v && v.trim().length > 0));
      if (!hasContent) {
        // 저장된 내용이 없음(편집기 미입력/미동기화) -> 편집기 유지하고 안내
        setSaveMsg("저장할 내용이 없습니다. 내용을 입력한 뒤 다시 저장해 주세요.");
        return;
      }
      savedInSession.current = true;
      setDirty(false); dirtyRef.current = false; bypassGuard.current = true;
      setWriteId(null);      // 대시보드로 복귀
      setEditorCfg(null);
      void refreshJournal(jid);  // 대시보드 상태값 갱신(작성중)
    } catch (e) {
      setSaveMsg("저장 실패: " + extractError(e, "문서 저장을 확인하지 못했습니다. 다시 시도해 주세요."));
    } finally {
      setSaving(false);
    }
  }

  async function submitFinal() {
    if (!currentJournal) return;
    if (!everDirty.current && !currentJournal.writtenDate) {
      setSaveMsg("입력된 내용이 없습니다. 내용을 작성한 뒤 저장해 주세요.");
      return;
    }
    const jid = currentJournal.id;
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.put(`/journals/${jid}`, {
        content: draft,
        startDate: currentJournal.startDate,
        endDate: currentJournal.endDate,
      });
      await api.post(`/journals/${jid}/submit`, { documentKey: editorDocKey });
      savedInSession.current = true;
      setDirty(false); dirtyRef.current = false; bypassGuard.current = true;
      setWriteId(null);      // 대시보드로 복귀
      setEditorCfg(null);
      pollSubmitted(jid);        // 대시보드 상태값 갱신(작성완료)
    } catch (e) {
      setSaveMsg("제출 실패: " + extractError(e, "문서 저장을 확인하지 못했습니다. 제출이 취소되었습니다."));
    } finally {
      setSaving(false);
    }
  }

  async function pollSubmitted(jid: number) {
    for (let i = 0; i < 18; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1500));
      try {
        const res = await api.get(`/journals/${jid}`);
        const j = res.data as Journal;
        // 제출 목표 상태(작성완료=SUBMITTED / 검토본 수정=MODIFIED)에 도달할 때까지 폴링.
        // 정정요청(CORRECTION_REQUESTED)에서 재제출하는 경우 초기 상태가 WRITING이 아니므로
        // "!= WRITING" 로 판단하면 옛 상태로 즉시 종료돼 화면이 갱신되지 않는다.
        if (j.status === "SUBMITTED" || j.status === "MODIFIED") {
          setJournals((prev) => prev.map((x) => (x.id === jid ? { ...x, ...j } : x)));
          return;
        }
      } catch {
        /* retry */
      }
    }
    try {
      await api.post(`/journals/${jid}/finalize-submit`, {});
      const res = await api.get(`/journals/${jid}`);
      setJournals((prev) => prev.map((x) => (x.id === jid ? { ...x, ...(res.data as Journal) } : x)));
    } catch {
      /* ignore */
    }
  }

  const feedbackData = currentJournal ? feedbacks[currentJournal.id] : null;
  const currentIdx = sortedJournals.findIndex((j) => j.id === writeId);
  function navigate(direction: 1 | -1) {
    const nextIdx = currentIdx + direction;
    if (nextIdx >= 0 && nextIdx < sortedJournals.length) openWrite(sortedJournals[nextIdx]);
  }

  function actionLabel(j: Journal) {
    if (pastDeadline) return "보기";
    if (j.status === "CORRECTION_REQUESTED") return "정정하기";
    if (j.status === "WRITING") return kindOf(j) === "draft" ? "이어쓰기" : "작성하기";
    return "수정";
  }

  // ── 주별: 표 (주차 · 기간 · 작성일 · 비고 · 작업) ──
  function renderWeeklyTable() {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-4">주차</th>
              <th className="py-2 pr-4">기간</th>
              <th className="py-2 pr-4">작성일</th>
              <th className="py-2 pr-4">비고</th>
              <th className="py-2 pr-4 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {sortedJournals.map((j) => {
              const st = kindStyle[kindOf(j)];
              return (
                <tr key={j.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4 font-medium">{j.week}주차</td>
                  <td className="py-3 pr-4 text-slate-500">
                    {j.startDate && j.endDate ? `${j.startDate} ~ ${j.endDate}` : "-"}
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{j.writtenDate ?? "—"}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${st.bg} ${st.fg}`}>{st.label}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Button size="sm" variant={j.status === "WRITING" ? "default" : "outline"} onClick={() => openWrite(j)}>
                      {actionLabel(j)}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── 일별: 월 달력(월 이동·오늘·주말·토요일 옆 주간요약) ──
  function renderDailyCalendar() {
    const dj = new Map<string, Journal>();
    sortedJournals.forEach((j) => { if (j.entryDate) dj.set(j.entryDate, j); });
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const monthEnd = new Date(y, m + 1, 0);
    const gridStart = new Date(y, m, 1);
    gridStart.setDate(1 - ((gridStart.getDay() - weekStart + 7) % 7));
    const today = ymd(new Date());
    const colStyle = { gridTemplateColumns: "repeat(7,1fr) 118px" } as React.CSSProperties;

    const rows: React.ReactNode[] = [];
    const rowStart = new Date(gridStart);
    let wk = 0;
    while (rowStart <= monthEnd) {
      const cells: React.ReactNode[] = [];
      let w = 0, c = 0, n = 0, any = false;
      const cur = new Date(rowStart);
      for (let i = 0; i < 7; i++) {
        const ds = ymd(cur);
        const dom = cur.getDate();
        const inMonth = cur.getMonth() === m;
        const j = inMonth ? dj.get(ds) ?? null : null;
        const isToday = ds === today;
        const wd = cur.getDay();
        const dcol = wd === 0 ? "text-red-500" : wd === 6 ? "text-blue-500" : "text-slate-700";
        if (j) {
          const k = kindOf(j);
          const st = kindStyle[k];
          any = true;
          if (k === "none") n++; else if (k === "corr") c++; else w++;
          cells.push(
            <button key={ds} onClick={() => openWrite(j)}
              className={`min-h-[62px] rounded-lg border p-1.5 text-left flex flex-col justify-between ${st.bg} ${isToday ? "border-2 border-blue-500" : "border-slate-200"}`}>
              <span className={`text-xs ${dcol}`}>{dom}</span>
              <span className={`text-[10px] font-medium ${st.fg}`}>{st.label}</span>
            </button>,
          );
        } else {
          cells.push(
            <div key={ds} className={`min-h-[62px] rounded-lg border border-slate-100 p-1.5 ${inMonth ? "bg-white" : "bg-slate-50 opacity-40"}`}>
              {inMonth && <span className="text-xs text-slate-300">{dom}</span>}
            </div>,
          );
        }
        cur.setDate(cur.getDate() + 1);
      }
      cells.push(
        <div key="sum" className={`min-h-[62px] rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2 flex flex-col justify-center gap-0.5 text-xs ${any ? "" : "opacity-30"}`}>
          {any ? (
            <>
              <div className="flex justify-between"><span className="text-slate-500">작성</span><span className="font-semibold text-blue-700">{w}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">정정</span><span className="font-semibold text-red-600">{c}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">미작성</span><span className="font-semibold text-slate-500">{n}</span></div>
            </>
          ) : (
            <span className="text-slate-300">-</span>
          )}
        </div>,
      );
      rows.push(<div key={wk++} className="grid gap-1.5 mb-1.5" style={colStyle}>{cells}</div>);
      rowStart.setDate(rowStart.getDate() + 7);
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setCalMonth(new Date(y, m - 1, 1))} aria-label="이전 달"><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-base font-medium w-28 text-center">{y}년 {m + 1}월</span>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setCalMonth(new Date(y, m + 1, 1))} aria-label="다음 달"><ChevronRight className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" className="h-8 ml-1" onClick={() => { const t = new Date(); setCalMonth(new Date(t.getFullYear(), t.getMonth(), 1)); }}>오늘</Button>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span className="mr-1">주 시작</span>
            <Button size="sm" variant={weekStart === 0 ? "default" : "outline"} className="h-7 px-2.5" onClick={() => changeWeekStart(0)}>일</Button>
            <Button size="sm" variant={weekStart === 1 ? "default" : "outline"} className="h-7 px-2.5" onClick={() => changeWeekStart(1)}>월</Button>
          </div>
        </div>
        <div className="grid gap-1.5 mb-1" style={colStyle}>
          {Array.from({ length: 7 }, (_, i) => {
            const wd = (weekStart + i) % 7;
            return (
              <div key={i} className={`text-center text-xs ${wd === 0 ? "text-red-500" : wd === 6 ? "text-blue-500" : "text-slate-500"}`}>{dowLabels[wd]}</div>
            );
          })}
          <div className="text-center text-xs text-slate-500 font-medium">주간 요약</div>
        </div>
        {rows}
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">불러오는 중...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="학생 대시보드" />
      <main className="container py-8 space-y-6">
        {enrollment && (
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="font-medium flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-blue-600" />{enrollment.practiceName}</span>
                <span className="text-slate-500">교과목 <b className="text-slate-800 font-medium">{enrollment.subject}</b></span>
                <span className="text-slate-500">기간 <b className="text-slate-800 font-medium">{enrollment.startDate ?? "-"} ~ {enrollment.endDate ?? "-"}</b></span>
                <span className="text-slate-500">방식 <b className="text-slate-800 font-medium">{cadence === "DAILY" ? "일별" : "주별"}</b></span>
                <span className="text-slate-500">지도교수 <b className="text-slate-800 font-medium">{enrollment.supervisorName ?? "-"}</b></span>
                <span className="ml-auto flex gap-2">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">작성완료 {doneCount}</span>
                  {draftCount > 0 && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">작성중 {draftCount}</span>
                  )}
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">미작성 {notCount}</span>
                  {corrCount > 0 && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700">⚠ 정정요청 {corrCount}</span>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium">{cadence === "DAILY" ? "일별 실습 일지" : "주차별 실습 일지"}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span><span className="inline-block w-2 h-2 rounded-full bg-slate-300 align-middle mr-1" />미작성</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 align-middle mr-1" />작성중</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 align-middle mr-1" />작성완료</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 align-middle mr-1" />정정요청</span>
              </div>
            </div>
            {cadence === "DAILY" ? renderDailyCalendar() : renderWeeklyTable()}
          </CardContent>
        </Card>
      {writeId !== null && currentJournal && enrollment && (
        <div
          ref={panelRef}
          className={
            expanded
              ? "fixed inset-0 z-50 bg-white flex flex-col"
              : "rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden h-[78vh] min-h-[520px]"
          }
        >
          <div className="relative z-[60] bg-white flex items-center justify-between border-b border-slate-200 px-3 py-2 md:px-6 md:py-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Badge className="bg-slate-100 text-slate-700">{user?.name ?? "학생"}</Badge>
              <Badge className={`${kindStyle[kindOf(currentJournal)].bg} ${kindStyle[kindOf(currentJournal)].fg}`}>
                {kindStyle[kindOf(currentJournal)].label}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="gap-1" disabled={currentIdx <= 0} onClick={() => navigate(-1)}>
                <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">이전</span>
              </Button>
              <h2 className="text-lg font-bold whitespace-nowrap">
                {currentJournal.entryDate ?? `${currentJournal.week}주차`} 일지
              </h2>
              <Button variant="ghost" size="sm" className="gap-1" disabled={currentIdx < 0 || currentIdx >= sortedJournals.length - 1} onClick={() => navigate(1)}>
                <span className="hidden sm:inline">다음</span><ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button size="icon" variant="ghost" onClick={toggleExpanded} aria-label={expanded ? "작게 보기" : "전체창으로 보기"} title={expanded ? "작게 보기" : "전체창"}>
              {expanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={closeWrite} aria-label="닫기"><X className="w-5 h-5" /></Button>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="flex-1 flex flex-col gap-2 md:gap-4 p-2 md:p-6 overflow-hidden">
              {/* 모바일: 사이드바가 숨겨지므로 정정 사유는 편집기 위에 표시 */}
              {currentJournal.status === "CORRECTION_REQUESTED" && currentJournal.correctionReason && (
                <div className="md:hidden rounded-md bg-red-50 border border-red-200 p-2">
                  <p className="text-xs font-medium text-red-700">⚠ 교수 정정 요청</p>
                  <p className="text-xs text-red-800 whitespace-pre-wrap">{currentJournal.correctionReason}</p>
                </div>
              )}
              <div className="flex-1 min-h-[400px] rounded-md border border-slate-200 overflow-hidden">
                {editorCfg && (
                  <OnlyOfficeEditor
                    onDirtyChange={(d) => { setDirty(d); dirtyRef.current = d; if (d) everDirty.current = true; }}
                    documentUrl={editorCfg.documentUrl}
                    documentKey={editorCfg.documentKey}
                    title={editorCfg.title}
                    mode={editorCfg.mode}
                    callbackUrl={editorCfg.callbackUrl}
                    className="h-full w-full"
                  />
                )}
              </div>
              {!isEditable && <p className="text-xs text-slate-400">실습 마감일이 지나 수정할 수 없습니다.</p>}
            </div>

            <div className="hidden md:block w-80 flex-shrink-0 border-l border-slate-200 p-6 overflow-y-auto space-y-3">
              {currentJournal.status === "CORRECTION_REQUESTED" && currentJournal.correctionReason && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-xs font-medium text-red-700 mb-1">⚠ 교수 정정 요청</p>
                  <p className="text-sm text-red-800 whitespace-pre-wrap">{currentJournal.correctionReason}</p>
                </div>
              )}
              <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-600" />피드백</h3>
              {feedbackData ? (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">{feedbackData.supervisorName} · {feedbackData.date}</p>
                  <p className="text-sm whitespace-pre-wrap bg-blue-50 rounded-md p-3">{feedbackData.content}</p>
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 opacity-60">
                  <p className="text-sm text-slate-400">등록된 피드백이 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-[60] bg-white flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-3 py-2 md:px-6 md:py-4 flex-shrink-0">
            {saveMsg && (
              <span className={`mr-auto text-sm ${saveMsg.includes("실패") ? "text-red-500" : "text-green-600"}`}>{saveMsg}</span>
            )}
            {isEditable ? (
              <>
                <Button variant="outline" onClick={closeWrite} disabled={saving}>취소</Button>
                <Button variant="outline" onClick={saveDraft} disabled={saving}>{saving ? "저장 중..." : "임시저장"}</Button>
                <Button
                  onClick={() => {
                    if (window.confirm("저장하시겠습니까? (실습 마감일까지 다시 수정할 수 있습니다)")) submitFinal();
                  }}
                  disabled={saving}
                >
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={closeWrite}>닫기</Button>
            )}
          </div>
        </div>
      )}

      </main>


    </div>
  );
}
