package com.wess.pilot.controller;

import com.wess.pilot.dto.AccountCreateRequest;
import com.wess.pilot.dto.AccountDto;
import com.wess.pilot.dto.AdminStatsDto;
import com.wess.pilot.dto.AdminStudentDto;
import com.wess.pilot.service.AccountService;
import com.wess.pilot.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final AccountService accountService;

    @GetMapping("/students")
    public List<AdminStudentDto> students() {
        return adminService.getStudents();
    }

    @GetMapping("/stats")
    public AdminStatsDto stats(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String semester) {
        return adminService.getStats(year, semester);
    }

    /** 계정(학생/지도자/관리자) 목록 */
    @GetMapping("/accounts")
    public List<AccountDto> accounts() {
        return accountService.list();
    }

    /** 계정 생성. STUDENT 권한은 기존 학생 연결 또는 신규 학생 생성과 함께 처리 */
    @PostMapping("/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    public AccountDto createAccount(@Valid @RequestBody AccountCreateRequest request) {
        return accountService.create(request);
    }
}
