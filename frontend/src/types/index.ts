// WESS_데모사이트_설계검토.md 의 데이터 모델/API 매핑을 기준으로 한 타입 정의

export type Role = "STUDENT" | "SUPERVISOR" | "ADMIN";

export type JournalStatus = "WRITING" | "SUBMITTED" | "REVIEWED";

export interface AuthUser {
  id: number;
  name: string;
  role: Role;
  /** role === "STUDENT" 인 경우 연결된 학생 id */
  studentId?: number;
}

/** 관리자가 양식관리에서 정의하는 작성 항목 */
export interface FormField {
  /** journal.content 의 key 로 사용됨 (예: "tasks", "learning", "thoughts") */
  key: string;
  /** 화면에 표시되는 항목명 (예: "주요 수행 업무") */
  label: string;
  type: "text" | "textarea" | "date" | "combo" | "checkbox";
  /** 학생 최종 제출 시 journals.content(DB)에 저장할지 여부. 기본 true */
  saveToDb?: boolean;
  /** combo/checkbox 타입일 때 선택 옵션 목록 */
  options?: string[];
}

export interface FormTemplate {
  id: number;
  year: number;
  semester: "1" | "2";
  subject: string;
  name: string;
  fields: FormField[];
  createdDate: string;
  /** 첨부된 docx 양식 원본의 MinIO 객체 경로 (선택) */
  templateFileKey?: string;
  /** 첨부된 docx 양식 원본 파일명 (선택) */
  templateFileName?: string;
  /** OnlyOffice 에디터 설정 — editor-config API 응답 시 채워짐 */
  documentUrl?: string;
  callbackUrl?: string;
  documentKey?: string;
}

/** 학생의 학기별 실습 배정 정보 */
export interface Enrollment {
  id: number;
  year: number;
  semester: "1" | "2";
  subject: string;
  practiceName: string;
  totalWeeks: number;
  formTemplate: FormTemplate;
  studentId?: number;
  studentName?: string;
  supervisorName?: string;
  createdDate?: string;
}

export interface Journal {
  id: number;
  week: number;
  status: JournalStatus;
  startDate?: string;
  endDate?: string;
  /** FormTemplate.fields 의 key 에 대응하는 입력값 */
  content: Record<string, string>;
  submittedDate?: string;
  hasFeedback: boolean;
  studentId?: number;
  studentName?: string;
  /** 지도자 화면에서 작성/조회 중인 피드백 내용 (REVIEWED 상태인 경우 기존 피드백) */
  feedbackContent?: string;
  /** 일지 본문 파일(docx)에 접근하기 위한 경로 (OnlyOffice 에디터에 전달) */
  fileUrl?: string;
  /** 에디터에 표시될 파일명 */
  fileName?: string;
  /** OnlyOffice document.key. 저장될 때마다 백엔드에서 새로 계산되어 내려온다 */
  documentKey?: string;
  /** OnlyOffice 컨테이너가 직접 호출할 내부망 문서 URL (자체서명 인증서 회피용) */
  documentUrl?: string;
  /** OnlyOffice 컨테이너가 직접 호출할 내부망 콜백 URL */
  callbackUrl?: string;
}

export interface Feedback {
  journalId: number;
  supervisorName: string;
  date: string;
  content: string;
}

export interface AdminStudent {
  id: number;
  name: string;
  major: string;
  year: number;
  completionRate: number;
}

export interface AdminStats {
  totalStudents: number;
  completionRate: number;
  formTemplateCount: number;
  totalJournals: number;
}

export interface ExportOptions {
  year: number;
  semester: "1" | "2";
  includeFeedback: boolean;
}

/** 로그인 계정 (관리자 화면의 계정/배정관리 탭) */
export interface Account {
  id: number;
  loginId: string;
  name: string;
  role: Role;
  studentId?: number;
  studentName?: string;
  createdDate: string;
}
