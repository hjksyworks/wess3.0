import * as React from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { OnlyOfficeEditor } from "@/components/OnlyOfficeEditor";
import type { FormField, FormTemplate } from "@/types";
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";

// ─── 타입 ──────────────────────────────────────────────────────────────────

type FieldType = FormField["type"];

const TYPE_LABELS: Record<FieldType, string> = {
  text: "텍스트",
  textarea: "여러줄",
  date: "날짜",
  combo: "선택목록",
  checkbox: "체크박스",
};

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────

interface Props {
  templates: FormTemplate[];
  onTemplatesChange: (templates: FormTemplate[]) => void;
}

export function FormManagePage({ templates, onTemplatesChange }: Props) {
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const [wizardOpen, setWizardOpen] = React.useState(false);

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleTemplateUpdate(updated: FormTemplate) {
    onTemplatesChange(templates.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleTemplateDelete(id: number) {
    onTemplatesChange(templates.filter((t) => t.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function handleTemplateCreated(template: FormTemplate) {
    onTemplatesChange([...templates, template]);
    setWizardOpen(false);
    setExpandedId(template.id);
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">양식 목록</h2>
        <Button size="sm" onClick={() => setWizardOpen(true)}>
          <Plus className="w-4 h-4" />
          새 양식 등록
        </Button>
      </div>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 w-8">#</th>
                <th className="px-4 py-2.5">양식명</th>
                <th className="px-4 py-2.5 w-28">연도·학기</th>
                <th className="px-4 py-2.5 w-28">교과목</th>
                <th className="px-4 py-2.5 w-20 text-center">필드수</th>
                <th className="px-4 py-2.5 w-32 text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                    등록된 양식이 없습니다
                  </td>
                </tr>
              )}
              {templates.map((t, idx) => (
                <React.Fragment key={t.id}>
                  {/* 리스트 행 */}
                  <tr
                    className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                      expandedId === t.id ? "bg-blue-50/60" : ""
                    }`}
                    onClick={() => toggleExpand(t.id)}
                  >
                    <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium flex items-center gap-1.5">
                      {expandedId === t.id ? (
                        <ChevronUp className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      )}
                      {t.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {t.year}년 {t.semester}학기
                    </td>
                    <td className="px-4 py-3 text-slate-500">{t.subject}</td>
                    <td className="px-4 py-3 text-center text-slate-500">
                      {t.fields?.length ?? 0}개
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                        title="삭제"
                        onClick={() => handleDeleteTemplate(t, handleTemplateDelete)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>

                  {/* Accordion 편집 패널 */}
                  {expandedId === t.id && (
                    <tr>
                      <td colSpan={6} className="px-0 py-0 bg-slate-50 border-b border-slate-200">
                        <TemplateEditPanel
                          template={t}
                          onUpdate={handleTemplateUpdate}
                          onClose={() => setExpandedId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 2단계 등록 Wizard */}
      {wizardOpen && (
        <NewTemplateWizard
          nextId={templates.length + 1}
          onCreated={handleTemplateCreated}
          onClose={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}

// ─── 삭제 핸들러 ────────────────────────────────────────────────────────────

async function handleDeleteTemplate(
  template: FormTemplate,
  onDelete: (id: number) => void,
) {
  if (!confirm(`"${template.name}" 양식을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
  try {
    await api.delete(`/form-templates/${template.id}`);
  } catch {
    // 백엔드 미연동 시 화면 상태만 반영
  }
  onDelete(template.id);
}

// ─── Accordion 편집 패널 ────────────────────────────────────────────────────

function TemplateEditPanel({
  template,
  onUpdate,
  onClose,
}: {
  template: FormTemplate;
  onUpdate: (t: FormTemplate) => void;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(template.name);
  const [year, setYear] = React.useState(template.year);
  const [semester, setSemester] = React.useState<"1" | "2">(template.semester);
  const [subject, setSubject] = React.useState(template.subject);
  const [fields, setFields] = React.useState<FormField[]>(template.fields ?? []);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  // OnlyOffice 에디터 오버레이
  const [editorConfig, setEditorConfig] = React.useState<{
    documentUrl: string;
    callbackUrl: string;
    documentKey: string;
  } | null>(null);

  // DOCX 업로드 파일 ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  function markDirty() {
    setDirty(true);
  }

  function addField() {
    setFields((f) => [...f, { key: "", label: "", type: "text", saveToDb: true, readOnly: false, width: 100, height: 40 }]);
    markDirty();
  }

  function updateField(idx: number, patch: Partial<FormField>) {
    setFields((f) => f.map((field, i) => (i === idx ? { ...field, ...patch } : field)));
    markDirty();
  }

  function removeField(idx: number) {
    setFields((f) => f.filter((_, i) => i !== idx));
    markDirty();
  }

  function moveField(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= fields.length) return;
    setFields((f) => {
      const arr = [...f];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
    markDirty();
  }

  async function handleSave() {
    if (!name.trim() || !subject.trim()) {
      alert("양식명과 교과목을 입력해주세요.");
      return;
    }
    if (fields.some((f) => !f.key.trim() || !f.label.trim())) {
      alert("모든 필드의 키와 항목명을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.put<FormTemplate>(`/form-templates/${template.id}`, {
        name: name.trim(),
        year,
        semester,
        subject: subject.trim(),
        fields,
      });
      onUpdate(res.data);
      setDirty(false);
      alert("저장되었습니다.");
    } catch {
      alert("저장에 실패했습니다. 서버 연결을 확인해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateDocx() {
    setGenerating(true);
    try {
      const res = await api.post<FormTemplate>(`/form-templates/${template.id}/generate-docx`);
      onUpdate(res.data);
      alert("DOCX가 자동 생성되었습니다.");
    } catch {
      alert("DOCX 자동 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<FormTemplate>(
        `/form-templates/${template.id}/file`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      onUpdate(res.data);
      alert("업로드 완료: " + file.name);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "업로드에 실패했습니다.";
      alert("❌ " + msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleOpenEditor() {
    try {
      const res = await api.get<FormTemplate>(`/form-templates/${template.id}/editor-config`);
      const data = res.data;
      if (!data.documentUrl || !data.callbackUrl || !data.documentKey) {
        alert("에디터 설정을 불러올 수 없습니다.");
        return;
      }
      setEditorConfig({
        documentUrl: data.documentUrl,
        callbackUrl: data.callbackUrl,
        documentKey: data.documentKey,
      });
    } catch {
      alert("에디터 정보를 불러오지 못했습니다.");
    }
  }

  return (
    <div className="px-6 py-4 space-y-5 border-l-4 border-blue-400">
      {/* 기본 정보 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">양식명</Label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); markDirty(); }}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">연도</Label>
          <Input
            type="number"
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); markDirty(); }}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">학기</Label>
          <Select
            value={semester}
            onChange={(e) => { setSemester(e.target.value as "1" | "2"); markDirty(); }}
            className="h-8 text-sm"
          >
            <option value="1">1학기</option>
            <option value="2">2학기</option>
          </Select>
        </div>
        <div className="col-span-4 space-y-1">
          <Label className="text-xs">교과목</Label>
          <Input
            value={subject}
            onChange={(e) => { setSubject(e.target.value); markDirty(); }}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* 필드 목록 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">필드 목록</Label>
          <Button size="sm" variant="outline" onClick={addField} className="h-7 text-xs">
            <Plus className="w-3 h-3" />
            필드 추가
          </Button>
        </div>

        {fields.length > 0 && (
          <div className="rounded border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs min-w-[780px]">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-left">
                  <th className="px-1.5 py-1.5 w-12 text-center">순서</th>
                  <th className="px-2 py-1.5 w-5">#</th>
                  <th className="px-2 py-1.5">항목명</th>
                  <th className="px-2 py-1.5 w-24">키 (key)</th>
                  <th className="px-2 py-1.5 w-24">타입</th>
                  <th className="px-2 py-1.5 w-16 text-center">너비(%)</th>
                  <th className="px-2 py-1.5 w-16 text-center">높이(pt)</th>
                  <th className="px-2 py-1.5 w-14 text-center">읽기전용</th>
                  <th className="px-2 py-1.5 w-14 text-center">DB저장</th>
                  <th className="px-2 py-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-1.5 py-1 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={() => moveField(idx, -1)}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 leading-none"
                          title="위로"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveField(idx, 1)}
                          disabled={idx === fields.length - 1}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 leading-none"
                          title="아래로"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-slate-400">{idx + 1}</td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        placeholder="예: 오늘의 업무"
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={field.key}
                        onChange={(e) => updateField(idx, { key: e.target.value })}
                        placeholder="예: tasks"
                        className="h-7 text-xs font-mono"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Select
                        value={field.type}
                        onChange={(e) => updateField(idx, { type: e.target.value as FieldType })}
                        className="h-7 text-xs"
                      >
                        {(Object.entries(TYPE_LABELS) as [FieldType, string][]).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Input
                        type="number"
                        min={10}
                        max={100}
                        value={field.width || 100}
                        onChange={(e) => updateField(idx, { width: Math.min(100, Math.max(10, Number(e.target.value))) })}
                        className="h-7 text-xs text-center w-full"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Input
                        type="number"
                        min={20}
                        max={300}
                        value={field.height || 40}
                        onChange={(e) => updateField(idx, { height: Math.min(300, Math.max(20, Number(e.target.value))) })}
                        className="h-7 text-xs text-center w-full"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={field.readOnly === true}
                        onChange={(e) => updateField(idx, { readOnly: e.target.checked })}
                        className="w-3.5 h-3.5"
                        title="학생이 수정 불가"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={field.saveToDb !== false}
                        onChange={(e) => updateField(idx, { saveToDb: e.target.checked })}
                        className="w-3.5 h-3.5"
                        title="제출 시 DB에 저장"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => removeField(idx)}
                        disabled={fields.length <= 1}
                        className="text-slate-300 hover:text-red-500 disabled:opacity-30 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 안내 */}
        <p className="text-xs text-slate-400">
          너비%: 같은 줄 필드의 합이 100 초과 시 자동 줄바꿈 / ☑ DB저장: 학생 최종 제출 시 DB에 기록
        </p>
      </div>

      {/* DOCX 관리 */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">DOCX 양식 파일</Label>
        {template.templateFileName && (
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <FileText className="w-3.5 h-3.5" />
            현재 파일: {template.templateFileName}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateDocx}
            disabled={generating}
            className="h-7 text-xs"
          >
            <RefreshCw className={`w-3 h-3 ${generating ? "animate-spin" : ""}`} />
            {generating ? "생성 중..." : "자동생성"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-7 text-xs"
          >
            <Upload className="w-3 h-3" />
            {uploading ? "업로드 중..." : "파일 업로드"}
          </Button>
          <Button
            size="sm"
            onClick={handleOpenEditor}
            className="h-7 text-xs"
          >
            <Edit2 className="w-3 h-3" />
            OnlyOffice 편집
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
        <Button size="sm" variant="outline" onClick={onClose} className="h-7 text-xs">
          닫기
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="h-7 text-xs"
        >
          {saving ? "저장 중..." : "저장 → DB"}
        </Button>
      </div>

      {/* OnlyOffice 풀스크린 편집 오버레이 */}
      {editorConfig && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
          <div className="flex items-center justify-between bg-white px-4 py-2 shadow-md flex-shrink-0">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-sm">{template.name}</span>
              <span className="text-xs text-slate-400">— 양식 템플릿 편집</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditorConfig(null);
                api.get<FormTemplate>(`/form-templates/${template.id}`)
                  .then((res) => onUpdate(res.data))
                  .catch(() => {});
              }}
            >
              편집 완료 · 닫기
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <OnlyOfficeEditor
              documentUrl={editorConfig.documentUrl}
              documentKey={editorConfig.documentKey}
              callbackUrl={editorConfig.callbackUrl}
              title={template.name}
              fileType="docx"
              mode="edit"
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2단계 등록 Wizard ──────────────────────────────────────────────────────

type WizardStep = "info" | "docx";

function NewTemplateWizard({
  nextId,
  onCreated,
  onClose,
}: {
  nextId: number;
  onCreated: (t: FormTemplate) => void;
  onClose: () => void;
}) {
  const [step, setStep] = React.useState<WizardStep>("info");
  const [createdTemplate, setCreatedTemplate] = React.useState<FormTemplate | null>(null);

  // 1단계 폼 상태
  const [name, setName] = React.useState("");
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [semester, setSemester] = React.useState<"1" | "2">("1");
  const [subject, setSubject] = React.useState("");
  const [fields, setFields] = React.useState<FormField[]>([
    { key: "tasks", label: "주요 수행 업무", type: "textarea", saveToDb: true, readOnly: false, width: 100, height: 80 },
  ]);
  const [submitting, setSubmitting] = React.useState(false);

  // 2단계
  const [generating, setGenerating] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function addField() {
    setFields((f) => [...f, { key: "", label: "", type: "text", saveToDb: true, readOnly: false, width: 100, height: 40 }]);
  }
  function updateField(idx: number, patch: Partial<FormField>) {
    setFields((f) => f.map((field, i) => (i === idx ? { ...field, ...patch } : field)));
  }
  function removeField(idx: number) {
    setFields((f) => f.filter((_, i) => i !== idx));
  }
  function moveField(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= fields.length) return;
    setFields((f) => {
      const arr = [...f];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  async function handleStep1Submit() {
    if (!name.trim() || !subject.trim()) {
      alert("양식명과 교과목을 입력해주세요.");
      return;
    }
    if (fields.length === 0 || fields.some((f) => !f.key.trim() || !f.label.trim())) {
      alert("모든 필드의 키와 항목명을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<FormTemplate>("/form-templates", {
        name: name.trim(),
        year,
        semester,
        subject: subject.trim(),
        fields,
      });
      setCreatedTemplate(res.data);
      setStep("docx");
    } catch {
      // 백엔드 미연동 시 임시 객체로 진행
      const mock: FormTemplate = {
        id: nextId,
        name: name.trim(),
        year,
        semester,
        subject: subject.trim(),
        fields,
        createdDate: new Date().toISOString().slice(0, 10),
      };
      setCreatedTemplate(mock);
      setStep("docx");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAutoGenerate() {
    if (!createdTemplate) return;
    setGenerating(true);
    try {
      const res = await api.post<FormTemplate>(
        `/form-templates/${createdTemplate.id}/generate-docx`,
      );
      onCreated(res.data);
    } catch {
      onCreated(createdTemplate);
    } finally {
      setGenerating(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !createdTemplate) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<FormTemplate>(
        `/form-templates/${createdTemplate.id}/file`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      onCreated(res.data);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "업로드에 실패했습니다.";
      alert("❌ " + msg);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  function handleSkipDocx() {
    if (createdTemplate) onCreated(createdTemplate);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col" style={{ maxWidth: "1700px" }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">새 양식 등록</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === "info"
                    ? "bg-blue-600 text-white"
                    : "bg-green-500 text-white"
                }`}
              >
                {step === "info" ? "1" : "✓"}
              </span>
              <span className={step === "info" ? "text-blue-600 font-medium" : "text-slate-400"}>
                정보 입력
              </span>
              <span className="text-slate-300">──</span>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === "docx" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"
                }`}
              >
                2
              </span>
              <span className={step === "docx" ? "text-blue-600 font-medium" : "text-slate-400"}>
                DOCX 준비
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">양식명</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 2026학년도 일일보고서"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">교과목</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="예: 현장실습"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">연도</Label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">학기</Label>
                  <Select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value as "1" | "2")}
                    className="h-8 text-sm"
                  >
                    <option value="1">1학기</option>
                    <option value="2">2학기</option>
                  </Select>
                </div>
              </div>

              {/* 필드 목록 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">필드 목록</Label>
                  <Button size="sm" variant="outline" onClick={addField} className="h-7 text-xs">
                    <Plus className="w-3 h-3" />
                    항목 추가
                  </Button>
                </div>
                <div className="rounded border border-slate-200 overflow-x-auto">
                  <table className="w-full text-xs min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 text-left">
                        <th className="px-1.5 py-1.5 w-12 text-center">순서</th>
                        <th className="px-2 py-1.5">항목명</th>
                        <th className="px-2 py-1.5 w-24">키 (key)</th>
                        <th className="px-2 py-1.5 w-20">타입</th>
                        <th className="px-2 py-1.5 w-14 text-center">너비(%)</th>
                        <th className="px-2 py-1.5 w-14 text-center">높이(pt)</th>
                        <th className="px-2 py-1.5 w-14 text-center">읽기전용</th>
                        <th className="px-2 py-1.5 w-14 text-center">DB저장</th>
                        <th className="px-2 py-1.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="px-1.5 py-1 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                onClick={() => moveField(idx, -1)}
                                disabled={idx === 0}
                                className="text-slate-400 hover:text-slate-700 disabled:opacity-20 leading-none"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => moveField(idx, 1)}
                                disabled={idx === fields.length - 1}
                                className="text-slate-400 hover:text-slate-700 disabled:opacity-20 leading-none"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              value={field.label}
                              onChange={(e) => updateField(idx, { label: e.target.value })}
                              placeholder="예: 오늘의 업무"
                              className="h-7 text-xs"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              value={field.key}
                              onChange={(e) => updateField(idx, { key: e.target.value })}
                              placeholder="tasks"
                              className="h-7 text-xs font-mono"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Select
                              value={field.type}
                              onChange={(e) =>
                                updateField(idx, { type: e.target.value as FieldType })
                              }
                              className="h-7 text-xs"
                            >
                              {(Object.entries(TYPE_LABELS) as [FieldType, string][]).map(
                                ([v, l]) => (
                                  <option key={v} value={v}>{l}</option>
                                ),
                              )}
                            </Select>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <Input
                              type="number"
                              min={10}
                              max={100}
                              value={field.width || 100}
                              onChange={(e) => updateField(idx, { width: Math.min(100, Math.max(10, Number(e.target.value))) })}
                              className="h-7 text-xs text-center w-full"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <Input
                              type="number"
                              min={20}
                              max={300}
                              value={field.height || 40}
                              onChange={(e) => updateField(idx, { height: Math.min(300, Math.max(20, Number(e.target.value))) })}
                              className="h-7 text-xs text-center w-full"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={field.readOnly === true}
                              onChange={(e) => updateField(idx, { readOnly: e.target.checked })}
                              className="w-3.5 h-3.5"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={field.saveToDb !== false}
                              onChange={(e) => updateField(idx, { saveToDb: e.target.checked })}
                              className="w-3.5 h-3.5"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              onClick={() => removeField(idx)}
                              disabled={fields.length <= 1}
                              className="text-slate-300 hover:text-red-500 disabled:opacity-30"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400">
                  너비%: 같은 줄 합이 100 초과 시 자동 줄바꿈 / ☑ DB저장: 최종 제출 시 DB에 저장
                </p>
              </div>
            </div>
          )}

          {step === "docx" && (
            <div className="space-y-6 py-2">
              <p className="text-sm text-slate-600">
                양식이 등록되었습니다. DOCX 양식 파일을 준비해주세요.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* 자동생성 카드 */}
                <button
                  onClick={handleAutoGenerate}
                  disabled={generating}
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left disabled:opacity-60"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <RefreshCw className={`w-5 h-5 text-blue-600 ${generating ? "animate-spin" : ""}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-700">
                      {generating ? "생성 중..." : "⚡ 자동생성"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      필드 기반으로 표 형식 DOCX를 자동으로 생성합니다.
                      이후 OnlyOffice에서 레이아웃을 수정할 수 있습니다.
                    </p>
                  </div>
                </button>

                {/* 파일 업로드 카드 */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-slate-200 hover:border-green-400 hover:bg-green-50/40 transition-all text-left disabled:opacity-60"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-700">
                      {uploading ? "업로드 중..." : "📁 파일 업로드"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      직접 만든 DOCX를 업로드합니다.
                      DB저장 필드의 key가 OnlyOffice 폼 태그와 일치해야 합니다.
                    </p>
                  </div>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200">
          <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">
            취소
          </Button>
          {step === "info" && (
            <Button size="sm" onClick={handleStep1Submit} disabled={submitting} className="h-8 text-xs">
              {submitting ? "저장 중..." : "저장 → 다음 단계"}
            </Button>
          )}
          {step === "docx" && (
            <Button size="sm" variant="ghost" onClick={handleSkipDocx} className="h-8 text-xs text-slate-500">
              나중에 하기
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
