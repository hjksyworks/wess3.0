import * as React from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { buildMockSupervisorJournals, mockFormTemplate } from "@/lib/mockData";
import { ClipboardCheck, Clock, Users } from "lucide-react";
const statusLabel = {
    WRITING: "작성중",
    SUBMITTED: "검토대기",
    REVIEWED: "검토완료",
};
const statusVariant = {
    WRITING: "bg-slate-100 text-slate-600",
    SUBMITTED: "bg-amber-100 text-amber-700",
    REVIEWED: "bg-green-100 text-green-700",
};
const fieldLabel = Object.fromEntries(mockFormTemplate.fields.map((f) => [f.key, f.label]));
export default function SupervisorDashboard() {
    const [journals, setJournals] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [detailId, setDetailId] = React.useState(null);
    const [feedbackText, setFeedbackText] = React.useState("");
    const [saving, setSaving] = React.useState(false);
    React.useEffect(() => {
        (async () => {
            try {
                const res = await api.get("/journals", { params: { role: "supervisor" } });
                setJournals(res.data);
            }
            catch {
                setJournals(buildMockSupervisorJournals());
            }
            finally {
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
    function openDetail(journal) {
        setDetailId(journal.id);
        setFeedbackText(journal.feedbackContent ?? "");
    }
    function navigate(direction) {
        const nextIdx = detailIdx + direction;
        if (nextIdx >= 0 && nextIdx < reviewableJournals.length) {
            openDetail(reviewableJournals[nextIdx]);
        }
    }
    async function submitFeedback() {
        if (!detail)
            return;
        setSaving(true);
        try {
            await api.post(`/journals/${detail.id}/feedback`, { content: feedbackText });
        }
        catch {
            // 백엔드 미연동 시 화면 상태만 갱신
        }
        setJournals((prev) => prev.map((j) => j.id === detail.id
            ? { ...j, status: "REVIEWED", hasFeedback: true, feedbackContent: feedbackText }
            : j));
        setSaving(false);
    }
    React.useEffect(() => {
        if (detail)
            setFeedbackText(detail.feedbackContent ?? "");
    }, [detail?.id]);
    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center text-slate-500">
        불러오는 중...
      </div>);
    }
    return (<div className="min-h-screen bg-slate-50">
      <DashboardHeader title="지도자 대시보드"/>

      <main className="container py-8 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0"/>
              <div className="leading-tight">
                <p className="text-xl font-bold">{studentCount}</p>
                <p className="text-xs text-slate-500">담당 학생</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0"/>
              <div className="leading-tight">
                <p className="text-xl font-bold">{pendingCount}</p>
                <p className="text-xs text-slate-500">검토 대기</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <ClipboardCheck className="w-5 h-5 text-green-600 flex-shrink-0"/>
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
                  {reviewableJournals.map((j) => (<tr key={j.id} className="border-b border-slate-100 last:border-0">
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
                    </tr>))}
                  {reviewableJournals.length === 0 && (<tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        제출된 일지가 없습니다.
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={detail !== null} onClose={() => setDetailId(null)} title={detail ? `${detail.studentName} · ${detail.week}주차 일지` : ""} className="max-w-3xl" footer={<>
            <Button variant="outline" size="sm" disabled={detailIdx <= 0} onClick={() => navigate(-1)}>
              이전
            </Button>
            <Button variant="outline" size="sm" disabled={detailIdx < 0 || detailIdx >= reviewableJournals.length - 1} onClick={() => navigate(1)}>
              다음
            </Button>
            <Button size="sm" onClick={submitFeedback} disabled={saving || !feedbackText.trim()}>
              {detail?.status === "REVIEWED" ? "피드백 수정" : "피드백 등록"}
            </Button>
          </>}>
        {detail && (<div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">실습 기간</p>
                <p className="font-medium">
                  {detail.startDate} ~ {detail.endDate}
                </p>
              </div>
              <div>
                <p className="text-slate-500">제출일</p>
                <p className="font-medium">{detail.submittedDate ?? "-"}</p>
              </div>
            </div>
            <div className="space-y-3">
              {Object.entries(detail.content).map(([key, value]) => (<div key={key}>
                  <p className="text-xs text-slate-500 mb-1">{fieldLabel[key] ?? key}</p>
                  <p className="text-sm whitespace-pre-wrap bg-slate-50 rounded-md p-3">{value || "-"}</p>
                </div>))}
            </div>
            <div className="border-t border-slate-200 pt-4 space-y-1.5">
              <Label>피드백 작성</Label>
              <Textarea rows={4} placeho/></></>)}</></>);
}
