package com.wess.pilot.domain;

/** 일지 상태: 작성중 -> 제출(불변) -> 검토완료 */
public enum JournalStatus {
    WRITING,
    SUBMITTED,
    REVIEWED
}
