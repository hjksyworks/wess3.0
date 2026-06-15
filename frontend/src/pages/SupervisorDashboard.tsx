import * as React from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { buildMockSupervisorJournals } from "@/lib/mockData";
import type { Journal, JournalStatus } from "@/types";
import { ChevronLeft, ChevronRight, ClipboardCheck, Clock, MessageSquare, Users, X } from "lucide-react";

const statusLabel: Record<JournalStatus, string> = {
  WRITING: "작성중",
  SUBMITTED: "검토대기",
  REVIEWED: "검토완료",
};

const statusVariant: Record<JournalStatus, string> = {
  WRITING: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-amber-100 text-amber-700",
  REVIEWED: "bg-green-100 text-green-700",
};

export default function SupervisorDashboard() {
  const [journals, setJournals] = React.useState<Journal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [feedbackText, setFeedbackText] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/journals", { params: { role: "supervisor" } });
        setJournals(res.data as Journal[]);
      } catch {
        setJournals(buildMockSupervisorJournals());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reviewableJournals = journals.filter((j) => j.status !== "WRITING");

  const studentCount = new Set(journals.map((j) => j.studentId)).size;
  const pendingCount = journals.filter((j) => j.status === "SUBMITTED").length;
  const reviewedCount = journals.filter((j) => j.status === "REVIEWED").length;

  const detailIdx = reviewableJournals.findIndex((j) => j.id === detailId);
  const detail = detailIdx >= 0 ? reviewableJournals[detailIdx] : null;

  function openDetail(journal: Journal) {
    setDetailId(journal.id);
    setFeedbackText(journal.feedbackContent ?? "");
  }

  function navigate(direction: 1 | -1) {
    const nextIdx = detailIdx + direction;
    if (nextIdx >= 0 && nextIdx < reviewableJournals.length) {
      openDetail(reviewableJournals[nextIdx]);
    }
  }

  async function submitFeedback() {
    if (!detail) return;
    setSaving(true);
    try {
      await api.post(`/journals/${detail.id}/feedback`, { content: feedbackText });
    } catch {
      // 백엔드 미연동 시 화면 상태만 갱신
    }
    setJournals((prev) =>
      prev.map((j) =>
        j.id === detail.id
          ? { ...j, status: "REVIEWED" as JournalStatus, hasFeedback: true, feedbackContent: feedbackText }
          : j,
      ),
    );
    setSaving(false);
  }

  React.useEffect(() => {
    if (detail) setFeedbackText(detail.feedbackContent ?? "");
  }, [detail?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="지도자 대시보드" />

      <main className="container py-8 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="leading-tight">
                <p className="text-xl font-bold">{studentCount}</p>
                <p className="text-xs text-slate-500">담당 학생</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="leading-tight">
                <p className="text-xl font-bold">{pendingCount}</p>
                <p className="text-xs text-slate-500">검토 대기</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <ClipboardCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="leading-tight">
                <p className="text-xl font-bold">{reviewedCount}</p>
                <p className="text-xs text-slate-500">검토 완료</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">학생 제출 일지</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4">학생명</th>
                    <th className="py-2 pr-4">주차</th>
                    <th className="py-2 pr-4">제출일</th>
                    <th className="py-2 pr-4">상태</th>
                    <th className="py-2 pr-4 text-right">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewableJournals.map((j) => (
                    <tr key={j.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4 font-medium">{j.studentName}</td>
                      <td className="py-3 pr-4">{j.week}주차</td>
                      <td className="py-3 pr-4 text-slate-500">{j.submittedDate ?? "-"}</td>
                      <td className="py-3 pr-4">
                        <Badge className={statusVariant[j.status]}>{statusLabel[j.status]}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => openDetail(j)}>
                          상세보기
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {reviewableJournals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        제출된 일지가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 학생 일지 상세보기 풀스크린 팝업 */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Badge className="bg-slate-100 text-slate-700">{detail.studentName}</Badge>
              <Badge className="bg-slate-100 text-slate-700">제출일 {detail.submittedDate ?? "-"}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                disabled={detailIdx <= 0}
                onClick={() => navigate(-1)}
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>
              <h2 className="text-lg font-bold whitespace-nowrap">{detail.week}주차 일지</h2>
              <span className="text-sm text-slate-500 whitespace-nowrap">
                시작일 {detail.startDate ?? "-"}, 종료일 {detail.endDate ?? "-"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                disabled={detailIdx < 0 || detailIdx >= reviewableJournals.length - 1}
                onClick={() => navigate(1)}
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setDetailId(null)} aria-label="닫기">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 본문 */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col gap-4 p-6 overflow-y-auto">
              <div className="flex-1 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center text-slate-400 text-lg font-semibold min-h-[400px]">
                OnlyOffice 에디터 영역
              </div>
            </div>

            {/* 피드백 작성 사이드바 */}
            <div className="w-80 flex-shrink-0 border-l border-slate-200 p-6 overflow-y-auto flex flex-col gap-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                피드백 작성
              </h3>
              <Textarea
                rows={10}
                placeholder="학생에게 전달할 피드백을 작성해주세요."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="flex-1 resize-none"
              />
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 flex-shrink-0">
            <Button variant="outline" onClick={() => setDetailId(null)}>
              닫기
            </Button>
            <Button onClick={submitFeedback} disabled={saving || !feedbackText.trim()}>
              {detail.status === "REVIEWED" ? "피드백 수정" : "피드백 등록"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
