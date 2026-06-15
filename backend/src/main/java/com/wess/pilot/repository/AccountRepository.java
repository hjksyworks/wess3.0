package com.wess.pilot.repository;

import com.wess.pilot.domain.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {

    Optional<Account> findByLoginId(String loginId);

    boolean existsByLoginId(String loginId);

    Optional<Account> findByStudentId(Long studentId);
}
