package com.wess.pilot.service;

import com.wess.pilot.domain.Account;
import com.wess.pilot.domain.Role;
import com.wess.pilot.domain.Student;
import com.wess.pilot.dto.AccountCreateRequest;
import com.wess.pilot.dto.AccountDto;
import com.wess.pilot.exception.ResourceNotFoundException;
import com.wess.pilot.repository.AccountRepository;
import com.wess.pilot.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<AccountDto> list() {
        return accountRepository.findAll().stream()
                .sorted(Comparator.comparing(Account::getRole).thenComparing(Account::getLoginId))
                .map(AccountDto::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public AccountDto create(AccountCreateRequest request) {
        if (accountRepository.existsByLoginId(request.getLoginId())) {
            throw new IllegalArgumentException("이미 사용중인 아이디입니다: " + request.getLoginId());
        }

        Role role;
        try {
            role = Role.valueOf(request.getRole());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("올바르지 않은 권한입니다: " + request.getRole());
        }

        Account account = new Account();
        account.setLoginId(request.getLoginId());
        account.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        account.setName(request.getName());
        account.setRole(role);
        account.setCreatedDate(LocalDate.now());

        if (role == Role.STUDENT) {
            account.setStudent(resolveStudent(request));
        }

        Account saved = accountRepository.save(account);
        return AccountDto.from(saved);
    }

    private Student resolveStudent(AccountCreateRequest request) {
        if (request.getStudentId() != null) {
            Student student = studentRepository.findById(request.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("학생을 찾을 수 없습니다. id=" + request.getStudentId()));
            if (accountRepository.findByStudentId(student.getId()).isPresent()) {
                throw new IllegalStateException("이미 계정이 연결된 학생입니다: " + student.getName());
            }
            return student;
        }

        Student student = Student.of(request.getName(), request.getMajor(), request.getStudentYear());
        return studentRepository.save(student);
    }
}
