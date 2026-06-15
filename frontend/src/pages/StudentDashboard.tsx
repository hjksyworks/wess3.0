import * as React from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
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
};

const statusVariant: Record<JournalStatus, string> = {
  WRITING: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-blue-100 text-blue-700",
  REVIEWED: "bg-green-100 text-green-700",
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = React.useState<Enrollment | null>(null);
  const [journals, setJournals] = React.useState<Journal[]>([]);
  const [feedbacks, setFeedbacks] = React.useState<Record<number, Feedback>>({});
  const [loading, setLoading] = React.useState(true);

  const [writeWeek, setWriteWeek] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

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

  const sortedJournals = [...journals].sort((a, b) => a.week - b.week);

  function openWrite(journal: Journal) {
    setWriteWeek(journal.week);
    setDraft({ ...journal.content });
  }

  function closeWrite() {
    setWriteWeek(null);
  }

  const currentJournal = journals.find((j) => j.week === writeWeek) ?? null;
  const isEditable = currentJournal?.status === "WRITING";

  async function saveJournal(submit: boolean) {
    if (!currentJournal) return;
    setSaving(true);
    const payload = {
      content: draft,
      startDate: currentJournal.startDate,
      endDate: currentJournal.endDate,
      status: (submit ? "SUBMITTED" : "WRITING") as JournalStatus,
    };
    try {
      await api.put(`/journals/${currentJournal.id}`, payload);
    } catch {
      // 백엔드 미연동 시 화면 상태만 갱신
    }
    setJournals((prev) =>
      prev.map((j) =>
        j.id === currentJournal.id
          ? {
              ...j,
              ...payload,
              submittedDate: submit ? new Date().toISOString().slice(0, 10) : j.submittedDate,
            }
          : j,
      ),
    );
    setSaving(false);
    setWriteWeek(null);
  }

  const feedbackData = currentJournal ? feedbacks[currentJournal.id] : null;
  const currentIdx = sortedJournals.findIndex((j) => j.week === writeWeek);

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
            <CardTitle className="text-base">주차별 실습 일지</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4">주차</th>
                    <th className="py-2 pr-4">기간</th>
                    <th className="py-2 pr-4">작성</th>
                    <th className="py-2 pr-4">상태</th>
                    <th className="py-2 pr-4">제출일</th>
                  </tr>
                </thead>
                <tbody>
                  {journals.map((j) => (
                    <tr key={j.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4 font-medium">{j.week}주차</td>
                      <td className="py-3 pr-4 text-slate-500">
                        {j.startDate && j.endDate ? `${j.startDate} ~ ${j.endDate}` : "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <Button size="sm" variant={j.status === "WRITING" ? "default" : "outline"} onClick={() => openWrite(j)}>
                          {j.status === "WRITING" ? "작성하기" : "보기"}
                        </Button>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={statusVariant[j.status]}>{statusLabel[j.status]}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{j.submittedDate ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 일지 작성/조회 풀스크린 팝업 */}
      {writeWeek !== null && currentJournal && enrollment && (
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
            <div className="flex-1 flex flex-col gap-4 p-6 overflow-y-auto">
              <div className="flex-1 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center text-slate-400 text-lg font-semibold min-h-[400px]">
                OnlyOffice 에디터 영역
              </div>

              {!isEditable && (
                <p className="text-xs text-slate-400">
                  {currentJournal.status === "REVIEWED" ? "검토 완료된" : "제출된"} 일지는 수정할 수 없습니다.
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
            {isEditable ? (
              <>
                <Button variant="outline" onClick={closeWrite} disabled={saving}>
                  취소
                </Button>
                <Button variant="outline" onClick={() => saveJournal(false)} disabled={saving}>
                  임시저장
                </Button>
                <Button
                  onClick={() => {
                    if (window.confirm("제출 후에는 수정할 수 없습니다. 최종 제출하시겠습니까?")) {
                      saveJournal(true);
                    }
                  }}
                  disabled={saving}
                >
                  최종 제출
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
