import type { AdminStats, AdminStudent, Enrollment, Feedback, FormTemplate, Journal } from "@/types";
export declare const mockFormTemplate: FormTemplate;
export declare const mockEnrollment: Enrollment;
export declare function buildMockJournals(): Journal[];
export declare const mockFeedbacks: Record<number, Feedback>;
export declare const mockAdminStudents: AdminStudent[];
export declare const mockAdminStats: AdminStats;
export declare const mockFormTemplates: FormTemplate[];
/** 지도자 화면에서 사용할, 여러 학생의 제출 일지 목록 */
export declare function buildMockSupervisorJournals(): Journal[];
