package com.wess.pilot.security;

import com.wess.pilot.domain.Enrollment;
import com.wess.pilot.domain.Journal;
import com.wess.pilot.domain.Role;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * 서비스 계층 수평(객체수준) 인가. URL 역할 게이트(SecurityConfig)가 막지 못하는
 * 리소스 소유권을 검증한다. 정책:
 *  - 일지/배정 조회: ADMIN·SUPERVISOR 전체, STUDENT 본인 것만
 *  - 일지 수정/제출: STUDENT 본인만(+ADMIN). SUPERVISOR 는 편집 불가(피드백 사용)
 *  - 피드백 작성: SUPERVISOR·ADMIN 만, 작성자명은 인증 주체에서 도출(사칭 차단)
 */
@Component
public class Authz {

    public AuthPrincipal current() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthPrincipal) {
            return (AuthPrincipal) auth.getPrincipal();
        }
        return null;
    }

    private AuthPrincipal require() {
        AuthPrincipal p = current();
        if (p == null) {
            throw new AccessDeniedException("인증이 필요합니다.");
        }
        return p;
    }

    public void assertJournalRead(Journal j) {
        AuthPrincipal p = require();
        if (p.getRole() == Role.ADMIN || p.getRole() == Role.SUPERVISOR) return;
        Long owner = ownerStudentId(j);
        if (owner == null || !owner.equals(p.getStudentId())) {
            throw new AccessDeniedException("본인 일지만 접근할 수 있습니다.");
        }
    }

    public void assertJournalWriteByOwner(Long ownerStudentId) {
        AuthPrincipal p = require();
        if (p.getRole() == Role.ADMIN) return;
        if (p.getRole() == Role.STUDENT) {
            if (ownerStudentId == null || !ownerStudentId.equals(p.getStudentId())) {
                throw new AccessDeniedException("본인 일지만 수정할 수 있습니다.");
            }
            return;
        }
        throw new AccessDeniedException("지도자는 학생 일지를 직접 수정할 수 없습니다. 피드백을 사용하세요.");
    }

    public void assertEnrollmentRead(Enrollment e) {
        AuthPrincipal p = require();
        if (p.getRole() == Role.ADMIN || p.getRole() == Role.SUPERVISOR) return;
        if (e.getStudent() == null || !e.getStudent().getId().equals(p.getStudentId())) {
            throw new AccessDeniedException("본인 배정만 조회할 수 있습니다.");
        }
    }

    public void assertStaff() {
        AuthPrincipal p = require();
        if (p.getRole() != Role.SUPERVISOR && p.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("지도자/관리자만 접근할 수 있습니다.");
        }
    }

    public void assertFeedbackWrite() {
        AuthPrincipal p = require();
        if (p.getRole() != Role.SUPERVISOR && p.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("지도자/관리자만 피드백을 등록할 수 있습니다.");
        }
    }

    public boolean isStudent() {
        AuthPrincipal p = current();
        return p != null && p.getRole() == Role.STUDENT;
    }

    public Long currentStudentId() {
        AuthPrincipal p = current();
        return p != null ? p.getStudentId() : null;
    }

    public String currentName() {
        AuthPrincipal p = current();
        return p != null ? p.getName() : null;
    }

    private Long ownerStudentId(Journal j) {
        if (j.getEnrollment() == null || j.getEnrollment().getStudent() == null) return null;
        return j.getEnrollment().getStudent().getId();
    }
}
