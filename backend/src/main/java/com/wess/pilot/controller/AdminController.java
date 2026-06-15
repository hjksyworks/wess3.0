package com.wess.pilot.controller;

import com.wess.pilot.dto.AdminStatsDto;
import com.wess.pilot.dto.AdminStudentDto;
import com.wess.pilot.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

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
}
