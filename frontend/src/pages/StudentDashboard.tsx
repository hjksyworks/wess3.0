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
import { CalendarDays, ChevronLeft, ChevronRight, MessageSquare, X } from "lucide-react";

const statusLabel: Record<JournalStatus, string> = {
  WRITING: "미작성",
  SUBMITTED: "제출완료",
  REVIEWED: "제출완료",
  MODIFIED: "제출완료",
  CORRECTION_REQUESTED: "정정요청",
};

type Kind = "none" | "draft" | "sub" | "rev" | "mod" | "corr";
const kindStyle: Record<Kind, { bg: string; fg: string; label: string }> = {
  none: { bg: "bg-slate-50", fg: "text-slate-400", label: "미작성" },
  draft: { bg: "bg-amber-50", fg: "text-amber-700", label: "작성중" },
  sub: { bg: "bg-blue-50", fg: "text-blue-700", label: "제출완료" },
  rev: { bg: "bg-green-50", fg: "text-green-700", label: "검토완료" },
  mod: { bg: "bg-purple-50", fg: "text-purple-700", label: "수정저장" },
  corr: { bg: "bg-red-50", fg: "text-red-700", label: "정정요청" },
};
function kindOf(j: Journal): Kind {
  if (j.status === "CORRECTION_REQUESTED") return "corr";
  if (j.status === "SUBMITTED" || j.status === "REVIEWED" || j.status === "MODIFIED") return "sub";
  if (Object.values(j.content ?? {}).some((v) => v && v.trim().length > 0)) return "draft";
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
  const doneCount = journals.filter(
    (j) => j.status === "SUBMITTED" || j.status === "REVIEWED" || j.status === "MODIFIED",
  ).length;
  const notCount = journals.filter((j) => j.status === "WRITING").length;
  const corrCount = journals.filter((j) => j.status === "CORRECTION_REQUESTED").length;

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

  function openWrite(journal: Journal) {
    setWriteId(journal.id);
    setDraft({ ...journal.content });
    setSaveMsg(null);
  }
  function closeWrite() {
    setWriteId(null);
    setSaveMsg(null);
  }

  const currentJournal = journals.find((j) => j.id === writeId) ?? null;
  const isEditable = currentJournal != null && !pastDeadline;
  const editorDocKey = currentJournal
    ? currentJournal.documentKey ??
      `journal-${currentJournal.id}-${currentJournal.status}-${currentJournal.submittedDate ?? currentJournal.startDate ?? ""}`
    : "";

  function extractError(e: unknown, fallback: string): string {
    const err = e as { response?: { data?: { message?: string } } };
    return err?.response?.data?.message ?? fallback;
  }

  async function saveDraft() {
    if (!currentJournal) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.put(`/journals/${currentJournal.id}`, {
        content: draft,
        startDate: currentJournal.startDate,
        endDate: currentJournal.endDate,
      });
      await api.post(`/journals/${currentJournal.id}/forcesave`, { documentKey: editorDocKey });
      setSaveMsg("임시저장되었습니다.");
    } catch (e) {
      setSaveMsg("저장 실패: " + extractError(e, "문서 저장을 확인하지 못했습니다. 다시 시도해 주세요."));
    } finally {
      setSaving(false);
    }
  }

  async function submitFinal() {
    if (!currentJournal) return;
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
      setWriteId(null);
      pollSubmitted(jid);
    } catch (e) {
      setSaveMsg("제출 실패: " + extractError(e, "문서 저장을 확인하지 못했습니다. 제출이 취소되었습니다."));
    } finally {
      setSaving(false);
    }
  }

  async function pollSubmitted(jid: number) {
    for (let i = 0; i < 18; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const res = await api.get(`/journals/${jid}`);
        const j = res.data as Journal;
        if (j.status !== "WRITING") {
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
    if (j.status === "WRITING") return "작성하기";
    if (j.status === "CORRECTION_REQUESTED") return "정정하기";
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
                <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 align-middle mr-1" />제출완료</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 align-middle mr-1" />정정요청</span>
              </div>
            </div>
            {cadence === "DAILY" ? renderDailyCalendar() : renderWeeklyTable()}
          </CardContent>
        </Card>
      </main>

      {writeId !== null && currentJournal && enrollment && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Badge className="bg-slate-100 text-slate-700">{user?.name ?? "학생"}</Badge>
              <Badge className={`${kindStyle[kindOf(currentJournal)].bg} ${kindStyle[kindOf(currentJournal)].fg}`}>
                {statusLabel[currentJournal.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="gap-1" disabled={currentIdx <= 0} onClick={() => navigate(-1)}>
                <ChevronLeft className="w-4 h-4" />이전
              </Button>
              <h2 className="text-lg font-bold whitespace-nowrap">
                {currentJournal.entryDate ?? `${currentJournal.week}주차`} 일지
              </h2>
              <Button variant="ghost" size="sm" className="gap-1" disabled={currentIdx < 0 || currentIdx >= sortedJournals.length - 1} onClick={() => navigate(1)}>
                다음<ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button size="icon" variant="ghost" onClick={closeWrite} aria-label="닫기"><X className="w-5 h-5" /></Button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col gap-4 p-6 overflow-hidden">
              <div className="flex-1 min-h-[400px] rounded-md border border-slate-200 overflow-hidden">
                <OnlyOfficeEditor
                  documentUrl={currentJournal.documentUrl ?? `${window.location.origin}${currentJournal.fileUrl ?? `/api/journals/${currentJournal.id}/file`}`}
                  documentKey={editorDocKey}
                  title={currentJournal.fileName ?? `${currentJournal.week}주차_일지.docx`}
                  mode={isEditable ? "edit" : "view"}
                  callbackUrl={currentJournal.callbackUrl ?? `${window.location.origin}/api/journals/${currentJournal.id}/callback`}
                  className="h-full w-full"
                />
              </div>
              {!isEditable && <p className="text-xs text-slate-400">실습 마감일이 지나 수정할 수 없습니다.</p>}
            </div>

            <div className="w-80 flex-shrink-0 border-l border-slate-200 p-6 overflow-y-auto space-y-3">
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

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 flex-shrink-0">
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
    </div>
  );
}
