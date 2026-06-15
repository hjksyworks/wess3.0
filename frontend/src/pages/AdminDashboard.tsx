import * as React from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { mockAdminStats, mockAdminStudents, mockFormTemplates } from "@/lib/mockData";
import type { AdminStats, AdminStudent, FormField, FormTemplate } from "@/types";
import { BarChart3, ClipboardList, Download, FileText, Plus, Trash2, Users } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<AdminStats>(mockAdminStats);
  const [students, setStudents] = React.useState<AdminStudent[]>(mockAdminStudents);
  const [templates, setTemplates] = React.useState<FormTemplate[]>(mockFormTemplates);
  const [loading, setLoading] = React.useState(true);

  const [newTemplateOpen, setNewTemplateOpen] = React.useState(false);

  const [exportYear, setExportYear] = React.useState(new Date().getFullYear());
  const [exportSemester, setExportSemester] = React.useState<"1" | "2">("1");
  const [includeFeedback, setIncludeFeedback] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const [statsRes, studentsRes, templatesRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/students"),
          api.get("/form-templates"),
        ]);
        setStats(statsRes.data as AdminStats);
        setStudents(studentsRes.data as AdminStudent[]);
        setTemplates(templatesRes.data as FormTemplate[]);
      } catch {
        setStats(mockAdminStats);
        setStudents(mockAdminStudents);
        setTemplates(mockFormTemplates);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get("/export/journals", {
        params: { year: exportYear, semester: exportSemester, includeFeedback },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journals_${exportYear}_${exportSemester}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("백엔드가 연동되지 않아 다운로드를 진행할 수 없습니다. (데모 모드)");
    } finally {
      setExporting(false);
    }
  }

  function handleAddTemplate(template: FormTemplate) {
    setTemplates((prev) => [...prev, template]);
    setNewTemplateOpen(false);
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
      <DashboardHeader title="관리자 대시보드" />

      <main className="container py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="leading-tight">
                <p className="text-xl font-bold">{stats.totalStudents}</p>
                <p className="text-xs text-slate-500">총 학생수</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <BarChart3 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="leading-tight">
                <p className="text-xl font-bold">{stats.completionRate}%</p>
                <p className="text-xs text-slate-500">평균 완료율</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <FileText className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div className="leading-tight">
                <p className="text-xl font-bold">{stats.formTemplateCount}</p>
                <p className="text-xs text-slate-500">양식 템플릿</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <ClipboardList className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="leading-tight">
                <p className="text-xl font-bold">{stats.totalJournals}</p>
                <p className="text-xs text-slate-500">총 일지수</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students">학생현황</TabsTrigger>
            <TabsTrigger value="templates">양식관리</TabsTrigger>
            <TabsTrigger value="export">일괄다운로드</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">학생 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200">
                        <th className="py-2 pr-4">이름</th>
                        <th className="py-2 pr-4">학과</th>
                        <th className="py-2 pr-4">학년</th>
                        <th className="py-2 pr-4">완료율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 pr-4 font-medium">{s.name}</td>
                          <td className="py-3 pr-4 text-slate-500">{s.major}</td>
                          <td className="py-3 pr-4 text-slate-500">{s.year}학년</td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${s.completionRate}%` }}
                                />
                              </div>
                              <span className="text-slate-500">{s.completionRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setNewTemplateOpen(true)}>
                <Plus className="w-4 h-4" />
                새 양식 추가
              </Button>
            </div>
            {templates.map((t) => (
              <Card key={t.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{t.name}</span>
                    <span className="text-xs font-normal text-slate-400">
                      {t.year}년 {t.semester}학기 · {t.subject}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {t.fields.map((f) => (
                      <li key={f.key} className="flex items-center gap-2">
                        <span className="font-medium">{f.label}</span>
                        <span className="text-xs text-slate-400">({f.key} · {f.type})</span>
                      </li>
                    ))}
                  </ul>
                  {t.templateFileName && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <FileText className="w-3.5 h-3.5" />
                      첨부 양식: {t.templateFileName}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="export" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">일지 일괄 다운로드</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>학년도</Label>
                    <Input
                      type="number"
                      value={exportYear}
                      onChange={(e) => setExportYear(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>학기</Label>
                    <Select value={exportSemester} onChange={(e) => setExportSemester(e.target.value as "1" | "2")}>
                      <option value="1">1학기</option>
                      <option value="2">2학기</option>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeFeedback}
                    onChange={(e) => setIncludeFeedback(e.target.checked)}
                    className="w-4 h-4 rounded border-input"
                  />
                  피드백 포함하여 다운로드
                </label>
                <Button onClick={handleExport} disabled={exporting}>
                  <Download className="w-4 h-4" />
                  {exporting ? "다운로드 중..." : "다운로드"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <NewTemplateDialog
        open={newTemplateOpen}
        onClose={() => setNewTemplateOpen(false)}
        onCreate={handleAddTemplate}
        nextId={templates.length + 1}
      />
    </div>
  );
}

function NewTemplateDialog({
  open,
  onClose,
  onCreate,
  nextId,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (template: FormTemplate) => void;
  nextId: number;
}) {
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [semester, setSemester] = React.useState<"1" | "2">("1");
  const [subject, setSubject] = React.useState("");
  const [name, setName] = React.useState("");
  const [fields, setFields] = React.useState<FormField[]>([
    { key: "tasks", label: "주요 수행 업무", type: "textarea" },
  ]);
  const [templateFile, setTemplateFile] = React.useState<File | null>(null);

  function addField() {
    setFields((f) => [...f, { key: "", label: "", type: "text" }]);
  }

  function updateField(idx: number, patch: Partial<FormField>) {
    setFields((f) => f.map((field, i) => (i === idx ? { ...field, ...patch } : field)));
  }

  function removeField(idx: number) {
    setFields((f) => f.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!name.trim() || !subject.trim() || fields.length === 0 || fields.some((f) => !f.key || !f.label)) {
      alert("양식 이름, 교과목, 모든 항목의 키/이름을 입력해주세요.");
      return;
    }
    let template: FormTemplate = {
      id: nextId,
      year,
      semester,
      subject,
      name,
      fields,
      createdDate: new Date().toISOString().slice(0, 10),
    };
    try {
      const res = await api.post("/form-templates", template);
      template = res.data as FormTemplate;
    } catch {
      // 백엔드 미연동 시 화면 상태만 갱신
    }

    if (templateFile) {
      try {
        const formData = new FormData();
        formData.append("file", templateFile);
        const res = await api.post(`/form-templates/${template.id}/file`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        template = res.data as FormTemplate;
      } catch {
        // 백엔드 미연동 시 파일명만 화면에 표시
        template = { ...template, templateFileName: templateFile.name };
      }
    }

    onCreate(template);
    setYear(new Date().getFullYear());
    setSemester("1");
    setSubject("");
    setName("");
    setFields([{ key: "tasks", label: "주요 수행 업무", type: "textarea" }]);
    setTemplateFile(null);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="새 양식 추가"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit}>추가</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>학년도</Label>
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>학기</Label>
            <Select value={semester} onChange={(e) => setSemester(e.target.value as "1" | "2")}>
              <option value="1">1학기</option>
              <option value="2">2학기</option>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>교과목</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="예: 현장실습" />
        </div>
        <div className="space-y-1.5">
          <Label>양식 이름</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 2026학년도 1학기 현장실습 일지" />
        </div>
        <div className="space-y-1.5">
          <Label>양식 파일 (docx, 선택)</Label>
          <Input
            type="file"
            accept=".docx"
            onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-slate-400">
            첨부하면 학생이 일지를 처음 작성할 때 이 docx 양식을 기반으로 시작합니다.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>작성 항목</Label>
            <Button size="sm" variant="outline" onClick={addField}>
              <Plus className="w-4 h-4" />
              항목 추가
            </Button>
          </div>
          <div className="space-y-2">
            {fields.map((field, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_110px_36px] gap-2 items-center">
                <Input
                  placeholder="key (예: tasks)"
                  value={field.key}
                  onChange={(e) => updateField(idx, { key: e.target.value })}
                />
                <Input
                  placeholder="항목명 (예: 주요 수행 업무)"
                  value={field.label}
                  onChange={(e) => updateField(idx, { label: e.target.value })}
                />
                <Select
                  value={field.type}
                  onChange={(e) => updateField(idx, { type: e.target.value as FormField["type"] })}
                >
                  <option value="text">텍스트</option>
                  <option value="textarea">서술형</option>
                  <option value="date">날짜</option>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeField(idx)}
                  disabled={fields.length <= 1}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
