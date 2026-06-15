// 백엔드 연동 전 데모/오프라인 동작을 위한 mock 데이터.
// 설계검토 문서(WESS_데모사이트_설계검토.md)의 데이터 모델을 기준으로 한다.

import type {
  AdminStats,
  AdminStudent,
  Enrollment,
  Feedback,
  FormTemplate,
  Journal,
} from "@/types";

export const mockFormTemplate: FormTemplate = {
  id: 1,
  year: 2026,
  semester: "1",
  subject: "현장실습",
  name: "2026학년도 1학기 현장실습 일지",
  fields: [
    { key: "tasks", label: "주요 수행 업무", type: "textarea" },
    { key: "learning", label: "학습 내용", type: "textarea" },
    { key: "thoughts", label: "느낀 점 및 의견", type: "textarea" },
  ],
  createdDate: "2026-02-20",
};

export const mockEnrollment: Enrollment = {
  id: 1,
  year: 2026,
  semester: "1",
  subject: "현장실습",
  practiceName: "(주)테크놀로지 백엔드 개발팀",
  totalWeeks: 8,
  formTemplate: mockFormTemplate,
};

/** 일지 본문 파일(docx) 스트리밍 경로 (백엔드 /api/journals/{id}/file, MinIO 비공개) */
function journalFileUrl(journalId: number): string {
  return `/api/journals/${journalId}/file`;
}

function weekDates(week: number): { startDate: string; endDate: string } {
  const base = new Date(2026, 2, 2); // 2026-03-02 (월)
  const start = new Date(base);
  start.setDate(base.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export function buildMockJournals(): Journal[] {
  const journals: Journal[] = [];
  for (let week = 1; week <= mockEnrollment.totalWeeks; week++) {
    const { startDate, endDate } = weekDates(week);
    if (week <= 3) {
      journals.push({
        id: week,
        week,
        status: week <= 2 ? "REVIEWED" : "SUBMITTED",
        startDate,
        endDate,
        content: {
          tasks: `${week}주차 업무: 사내 시스템 환경 구성 및 API 명세 검토`,
          learning: `${week}주차에는 Spring Boot 프로젝트 구조와 REST API 설계 원칙을 학습했습니다.`,
          thoughts: "실제 서비스 코드를 보며 이론과 실무의 차이를 체감할 수 있었습니다.",
        },
        submittedDate: `${startDate.slice(0, 4)}-${startDate.slice(5, 7)}-${String(
          Number(startDate.slice(8, 10)) + 5,
        ).padStart(2, "0")}`,
        hasFeedback: week <= 2,
        fileUrl: journalFileUrl(week),
        fileName: `${week}주차_일지.docx`,
        documentKey: `journal-${week}-mock`,
      });
    } else if (week === 4) {
      journals.push({
        id: week,
        week,
        status: "WRITING",
        startDate,
        endDate,
        content: {
          tasks: "작성 중인 업무 내용입니다.",
          learning: "",
          thoughts: "",
        },
        hasFeedback: false,
        fileUrl: journalFileUrl(week),
        fileName: `${week}주차_일지.docx`,
        documentKey: `journal-${week}-mock`,
      });
    } else {
      journals.push({
        id: week,
        week,
        status: "WRITING",
        startDate,
        endDate,
        content: {},
        hasFeedback: false,
        fileUrl: journalFileUrl(week),
        fileName: `${week}주차_일지.docx`,
        documentKey: `journal-${week}-mock`,
      });
    }
  }
  return journals;
}

export const mockFeedbacks: Record<number, Feedback> = {
  1: {
    journalId: 1,
    supervisorName: "김지은 교수",
    date: "2026-03-09",
    content:
      "첫 주차 적응 잘 하고 있는 것 같습니다. 업무 내용을 조금 더 구체적으로 작성하면 좋겠습니다.",
  },
  2: {
    journalId: 2,
    supervisorName: "김지은 교수",
    date: "2026-03-16",
    content: "API 설계 원칙에 대한 이해도가 잘 드러납니다. 다음 주에도 학습 내용을 꾸준히 기록해주세요.",
  },
};

export const mockAdminStudents: AdminStudent[] = [
  { id: 1, name: "이준호", major: "컴퓨터공학과", year: 4, completionRate: 38 },
  { id: 2, name: "박서연", major: "정보통신공학과", year: 4, completionRate: 50 },
  { id: 3, name: "최민수", major: "소프트웨어학과", year: 3, completionRate: 25 },
  { id: 4, name: "정하늘", major: "컴퓨터공학과", year: 4, completionRate: 63 },
];

export const mockAdminStats: AdminStats = {
  totalStudents: mockAdminStudents.length,
  completionRate: Math.round(
    mockAdminStudents.reduce((sum, s) => sum + s.completionRate, 0) / mockAdminStudents.length,
  ),
  formTemplateCount: 1,
  totalJournals: mockAdminStudents.length * mockEnrollment.totalWeeks,
};

export const mockFormTemplates: FormTemplate[] = [mockFormTemplate];

/** 지도자 화면에서 사용할, 여러 학생의 제출 일지 목록 */
export function buildMockSupervisorJournals(): Journal[] {
  const names = mockAdminStudents.map((s) => s.name);
  const journals: Journal[] = [];
  let id = 100;
  names.forEach((name, idx) => {
    for (let week = 1; week <= 3; week++) {
      const { startDate, endDate } = weekDates(week);
      const status = idx % 2 === 0 && week === 1 ? "REVIEWED" : week <= 2 ? "SUBMITTED" : "WRITING";
      if (status === "WRITING") continue;
      const journalId = id++;
      journals.push({
        id: journalId,
        week,
        status,
        startDate,
        endDate,
        content: {
          tasks: `${name}의 ${week}주차 주요 업무 내용입니다.`,
          learning: `${name}의 ${week}주차 학습 내용입니다.`,
          thoughts: `${name}의 ${week}주차 느낀 점입니다.`,
        },
        submittedDate: endDate,
        hasFeedback: status === "REVIEWED",
        feedbackContent:
          status === "REVIEWED" ? `${name} 학생, ${week}주차 일지 잘 작성했습니다. 계속 수고해주세요.` : undefined,
        studentId: mockAdminStudents[idx].id,
        studentName: name,
        fileUrl: journalFileUrl(journalId),
        fileName: `${name}_${week}주차_일지.docx`,
        documentKey: `journal-${journalId}-mock`,
      });
    }
  });
  return journals;
}
