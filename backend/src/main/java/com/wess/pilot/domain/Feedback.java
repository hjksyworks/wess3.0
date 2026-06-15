package com.wess.pilot.domain;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.Lob;
import javax.persistence.OneToOne;
import javax.persistence.Table;
import java.time.LocalDate;

/** 일지에 대한 지도자 피드백 (1:1) */
@Entity
@Table(name = "feedbacks")
@Getter
@Setter
@NoArgsConstructor
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journal_id", nullable = false, unique = true)
    private Journal journal;

    @Column(name = "supervisor_name")
    private String supervisorName;

    @Column(name = "feedback_date")
    private LocalDate date;

    @Lob
    @Column(name = "content")
    private String content;
}
