package com.wess.pilot.controller;

import com.wess.pilot.dto.EnrollmentCreateRequest;
import com.wess.pilot.dto.EnrollmentDto;
import com.wess.pilot.exception.ResourceNotFoundException;
import com.wess.pilot.security.AuthPrincipal;
import com.wess.pilot.service.EnrollmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    /** GET /api/enrollments?studentId=&year=&semester= — 관리자/지도자용 목록 조회 */
    @GetMapping
    public List<EnrollmentDto> list(
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String semester) {
        return enrollmentService.list(studentId, year, semester);
    }

    /** GET /api/enrollments/me — 로그인한 학생 본인의 최근 실습 배정 */
    @GetMapping("/me")
    public EnrollmentDto me(@AuthenticationPrincipal AuthPrincipal principal) {
        if (principal.getStudentId() == null) {
            throw new ResourceNotFoundException("학생 계정에만 제공되는 정보입니다.");
        }
        return enrollmentService.findCurrentForStudent(principal.getStudentId());
    }

    @GetMapping("/{id}")
    public EnrollmentDto get(@PathVariable Long id) {
        return enrollmentService.findById(id);
    }

    /** POST /api/enrollments — 실습 배정 생성 + 주차별 Journal 자동 생성 (관리자 전용) */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EnrollmentDto create(@Valid @RequestBody EnrollmentCreateRequest request) {
        return enrollmentService.create(request);
    }
}
