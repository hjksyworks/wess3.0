package com.wess.pilot.domain;

/** 일지 상태: 작성중(임시저장) -> 제출(저장) -> 검토완료 / 검토후수정(수정저장). 실습 마감일까지 수정 가능 */
public enum JournalStatus {
    WRITING,
    SUBMITTED,
    REVIEWED,
    /** 검토완료 후 학생이 다시 수정함 — 교수 재검토 필요(수정저장) */
    MODIFIED,
    /** 교수가 정정 요청함(반려) — 학생이 사유 확인 후 수정 필요 */
    CORRECTION_REQUESTED
}
