import * as React from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { OnlyOfficeEditor } from "@/components/OnlyOfficeEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { mockEnrollment, mockFeedbacks, buildMockJournals } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";
import type { Enrollment, Feedback, Journal, JournalStatus } from "@/types";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  MessageSquare,
  PencilLine,
  X,
} from "lucide-react";

const statusLabel: Record<JournalStatus, string> = {
  WRITING: "미작성",
  SUBMITTED: "작성완료",
  REVIEWED: "검토완료",
  MODIFIED: "수정저장",
};

const statusVariant: Record<JournalStatus, string> = {
  WRITING: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-blue-100 text-blue-700",
  REVIEWED: "bg-green-100 text-green-700",
  MODIFIED: "bg-purple-100 text-purple-700",
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
          js
            .filter((j) => j.hasFeedback)
            .map(async (j) => {
              try {
                const fbRes = await api.get(`/journals/${j.id}/feedback`);
                fbMap[j.id] = fbRes.data as Feedback;
              } catch {
                // ignore individual failures
              }
            }),
        );
        setFeedbacks(fbMap);
      } catch {
        setEnrollment(mockEnrollment);
        const js = buildMockJournals();
        setJournals(js);
        setFeedbacks(mockFeedbacks);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const writtenCount = journals.filter((j) => j.status === "SUBMITTED" || j.status === "REVIEWED").length;
  const draftCount = journals.filter(
    (j) => j.status === "WRITING" && Object.values(j.content).some((v) => v && v.trim().length > 0),
  ).length;
  const notStartedCount = journals.length - writtenCount - draftCount;

  const recentFeedbacks = journals
    .filter((j) => j.hasFeedback && feedbacks[j.id])
    .sort((a, b) => b.week - a.week)
    .slice(0, 3);

  const sortedJournals = [...journals].sort((a, b) => {
    if (a.entryDate && b.entryDate) return a.entryDate.localeCompare(b.entryDate);
    return a.week - b.week;
  });
  const cadence = journals.find((j) => j.cadence)?.cadence ?? "WEEKLY";

  function kindOf(j: Journal): "rev" | "sub" | "draft" | "none" | "mod" {
    if (j.status === "REVIEWED") return "rev";
    if (j.status === "MODIFIED") return "mod";
    if (j.status === "SUBMITTED") return "sub";
    if (Object.values(j.content ?? {}).some((v) => v && v.trim().length > 0)) return "draft";
    return "none";
  }
  const kindStyle: Record<string, { bg: string; fg: string; label: string }> = {
    rev: { bg: "bg-green-50", fg: "text-green-700", label: "검토완료" },
    sub: { bg: "bg-blue-50", fg: "text-blue-700", label: "제출완료" },
    draft: { bg: "bg-amber-50", fg: "text-amber-700", label: "작성중" },
    none: { bg: "bg-slate-50", fg: "text-slate-400", label: "미작성" },
    mod: { bg: "bg-purple-50", fg: "text-purple-700", label: "수정저장" },
  };
  const dowLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parseYmd = (str: string) => {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const practiceEnd = enrollment?.endDate ?? null;
  const pastDeadline = practiceEnd != null && ymd(new Date()) > practiceEnd;

  function renderWeeklyList() {
    return (
      <div className="flex flex-col gap-2">
        {sortedJournals.map((j) => {
          const st = kindStyle[kindOf(j)];
          return (
            <div key={j.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <div className="min-w-[70px]">
                <div className="font-medium text-sm">{j.week}주차</div>
                <div className="text-xs text-slate-400">
                  {j.startDate && j.endDate ? `${j.startDate} ~ ${j.endDate}` : "-"}
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${st.bg} ${st.fg}`}>{st.label}</span>
              <Button size="sm" variant={j.status === "WRITING" ? "default" : "outline"} className="ml-auto" onClick={() => openWrite(j)}>
                {pastDeadline ? "보기" : j.status === "WRITING" ? "작성하기" : "수정"}
              </Button>
            </div>
          );
        })}
      </div>
    );
  }

  function renderDailyCalendar() {
    const dj = new Map<string, Journal>();
    sortedJournals.forEach((j) => { if (j.entryDate) dj.set(j.entryDate, j); });
    const keys = [...dj.keys()].sort();
    if (keys.length === 0)
      return <p className="text-sm text-slate-400 py-6 text-center">생성된 일지가 없습니다.</p>;
    const first = parseYmd(keys[0]);
    const last = parseYmd(keys[keys.length - 1]);
    const start = new Date(first); start.setDate(first.getDate() - first.getDay());
    const end = new Date(last); end.setDate(last.getDate() + (6 - last.getDay()));
    const today = ymd(new Date());
    const rows: React.ReactNode[] = [];
    const cur = new Date(start);
    let wk = 0;
    while (cur <= end) {
      const cells: React.ReactNode[] = [];
      for (let i = 0; i < 7; i++) {
        const ds = ymd(cur);
        const dom = cur.getDate();
        const j = dj.get(ds) ?? null;
        const isToday = ds === today;
        const dcol = i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-700";
        if (j) {
          const st = kindStyle[kindOf(j)];
          cells.push(
            <button key={ds} onClick={() => openWrite(j)}
              className={`min-h-[58px] rounded-lg border p-1.5 text-left flex flex-col justify-between ${st.bg} ${isToday ? "border-2 border-blue-500" : "border-slate-200"}`}>
              <span className={`text-xs ${dcol}`}>{dom}</span>
              <span className={`text-[10px] font-medium ${st.fg}`}>{st.label}</span>
            </button>,
          );
        } else {
          cells.push(
            <div key={ds} className="min-h-[58px] rounded-lg border border-slate-100 bg-slate-50 p-1.5 opacity-60">
              <span className="text-xs text-slate-300">{dom}</span>
            </div>,
          );
        }
        cur.setDate(cur.getDate() + 1);
      }
      rows.push(<div key={wk++} className="grid grid-cols-7 gap-1.5">{cells}</div>);
    }
    return (
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-7 gap-1.5 mb-1">
          {dowLabels.map((d, i) => (
            <div key={d} className={`text-center text-xs ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-500"}`}>{d}</div>
          ))}
        </div>
        {rows}
      </div>
    );
  }

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

  // 임시저장: 폼 필드 저장 + OnlyOffice 강제저장(확정). 상태는 WRITING 유지, 편집기 열어둠.
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

  // 최종 제출: 폼 필드 저장 + 제출대기 표시 후 편집기를 닫는다.
  // 편집기 종료 콜백이 최신 내용을 저장하면서 '동시에' SUBMITTED 로 확정하므로 마지막 편집이 유실되지 않는다.
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
      setWriteId(null); // 편집기 unmount -> 종료 콜백이 저장+제출확정
      pollSubmitted(jid);
    } catch (e) {
      setSaveMsg("제출 실패: " + extractError(e, "문서 저장을 확인하지 못했습니다. 제출이 취소되었습니다."));
    } finally {
      setSaving(false);
    }
  }

  // 제출 확정을 백그라운드 폴링. 콜백이 지연되면 폴백 확정을 호출한다.
  async function pollSubmitted(jid: number) {
    for (let i = 0; i < 18; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const res = await api.get(`/journals/${jid}`);
        const j = res.data as Journal;
        if (j.status === "SUBMITTED" || j.status === "REVIEWED") {
          setJournals((prev) => prev.map((x) => (x.id === jid ? { ...x, ...j } : x)));
          return;
        }
      } catch {
        // 재시도
      }
    }
    try {
      await api.post(`/journals/${jid}/finalize-submit`, {});
      const res = await api.get(`/journals/${jid}`);
      setJournals((prev) => prev.map((x) => (x.id === jid ? { ...x, ...(res.data as Journal) } : x)));
    } catch {
      // 무시
    }
  }

  const feedbackData = currentJournal ? feedbacks[currentJournal.id] : null;
  const currentIdx = sortedJournals.findIndex((j) => j.id === writeId);

  function navigateWeek(direction: 1 | -1) {
    const nextIdx = currentIdx + direction;
    if (nextIdx >= 0 && nextIdx < sortedJournals.length) {
      openWrite(sortedJournals[nextIdx]);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="학생 대시보드" />

      <main className="container py-8 space-y-6">
        {enrollment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                {enrollment.practiceName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">학년도 / 학기</p>
                  <p className="font-medium">{enrollment.year}년 {enrollment.semester}학기</p>
                </div>
                <div>
                  <p className="text-slate-500">교과목</p>
                  <p className="font-medium">{enrollment.subject}</p>
                </div>
                <div>
                  <p className="text-slate-500">총 주차</p>
                  <p className="font-medium">{enrollment.totalWeeks}주</p>
                </div>
                <div>
                  <p className="text-slate-500">양식</p>
                  <p className="font-medium">{enrollment.formTemplate.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="leading-tight">
                <p className="text-xl font-bold">{writtenCount}</p>
                <p className="text-xs text-slate-500">작성완료</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <PencilLine className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="leading-tight">
                <p className="text-xl font-bold">{draftCount}</p>
                <p className="text-xs text-slate-500">임시저장</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Circle className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div className="leading-tight">
                <p className="text-xl font-bold">{notStartedCount}</p>
                <p className="text-xs text-slate-500">미작성</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {recentFeedbacks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                최근 피드백
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentFeedbacks.map((j) => {
                const fb = feedbacks[j.id];
                return (
                  <button
                    key={j.id}
                    onClick={() => openWrite(j)}
                    className="w-full text-left p-3 rounded-md border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{j.week}주차</span>
                      <span className="text-xs text-slate-400">
                        {fb.supervisorName} · {fb.date}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{fb.content}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {cadence === "DAILY" ? "일별 실습 일지" : "주차별 실습 일지"}
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span><span className="inline-block w-2 h-2 rounded-full bg-slate-300 align-middle mr-1"></span>미작성</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 align-middle mr-1"></span>작성중</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 align-middle mr-1"></span>제출완료</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 align-middle mr-1"></span>검토완료</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {cadence === "DAILY" ? renderDailyCalendar() : renderWeeklyList()}
          </CardContent>
        </Card>
      </main>

      {/* 일지 작성/조회 풀스크린 팝업 */}
      {writeId !== null && currentJournal && enrollment && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Badge className="bg-slate-100 text-slate-700">{user?.name ?? "학생"}</Badge>
              <Badge className="bg-slate-100 text-slate-700">
                제출일 {currentJournal.submittedDate ?? "미제출"}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                disabled={currentIdx <= 0}
                onClick={() => navigateWeek(-1)}
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>
              <h2 className="text-lg font-bold whitespace-nowrap">{currentJournal.week}주차 일지</h2>
              <span className="text-sm text-slate-500 whitespace-nowrap">
                시작일 {currentJournal.startDate ?? "-"}, 종료일 {currentJournal.endDate ?? "-"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                disabled={currentIdx < 0 || currentIdx >= sortedJournals.length - 1}
                onClick={() => navigateWeek(1)}
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button size="icon" variant="ghost" onClick={closeWrite} aria-label="닫기">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 본문 */}
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

              {!isEditable && (
                <p className="text-xs text-slate-400">
                  실습 마감일이 지나 수정할 수 없습니다.
                </p>
              )}
            </div>

            {/* 피드백 사이드바 */}
            <div className="w-80 flex-shrink-0 border-l border-slate-200 p-6 overflow-y-auto space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                피드백
              </h3>
              {feedbackData ? (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">
                    {feedbackData.supervisorName} · {feedbackData.date}
                  </p>
                  <p className="text-sm whitespace-pre-wrap bg-blue-50 rounded-md p-3">
                    {feedbackData.content}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 opacity-60">
                  <p className="text-sm text-slate-400">등록된 피드백이 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 flex-shrink-0">
            {saveMsg && (
              <span
                className={`mr-auto text-sm ${saveMsg.includes("실패") ? "text-red-500" : "text-green-600"}`}
              >
                {saveMsg}
              </span>
            )}
            {isEditable ? (
              <>
                <Button variant="outline" onClick={closeWrite} disabled={saving}>
                  취소
                </Button>
                <Button variant="outline" onClick={saveDraft} disabled={saving}>
                  {saving ? "저장 중..." : "임시저장"}
                </Button>
                <Button
                  onClick={() => {
                    if (window.confirm("저장하시겠습니까? (실습 마감일까지 다시 수정할 수 있습니다)")) {
                      submitFinal();
                    }
                  }}
                  disabled={saving}
                >
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={closeWrite}>
                닫기
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
