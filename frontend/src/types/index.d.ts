export type Role = "STUDENT" | "SUPERVISOR" | "ADMIN";
export type JournalStatus = "WRITING" | "SUBMITTED" | "REVIEWED";
export interface AuthUser {
    id: number;
    name: string;
    role: Role;
}
/** 관리자가 양식관리에서 정의하는 작성 항목 */
export interface FormField {
    /** journal.content 의 key 로 사용됨 (예: "tasks", "learning", "thoughts") */
    key: string;
    /** 화면에 표시되는 항목명 (예: "주요 수행 업무") */
    label: string;
    type: "text" | "textarea" | "date";
}
export interface FormTemplate {
    id: number;
    year: number;
    semester: "1" | "2";
    subject: string;
    name: string;
    fields: FormField[];
    createdDate: string;
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
