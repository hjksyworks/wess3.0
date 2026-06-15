package com.wess.pilot.domain;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;

/**
 * 학생 정보. 별도 인증/계정 체계가 확정되기 전까지는 관리자 화면의 학생현황/배정 대상
 * 식별용으로 사용하는 단순 엔티티.
 */
@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private String name;

    @Column
    private String major;

    /** 학년 (1~4) */
    @Column(name = "grade_year")
    private Integer year;

    private Student(String name, String major, Integer year) {
        this.name = name;
        this.major = major;
        this.year = year;
    }

    public static Student of(String name, String major, Integer year) {
        return new Student(name, major, year);
    }
}
