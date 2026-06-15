package com.wess.pilot.service;

import com.wess.pilot.domain.Feedback;
import com.wess.pilot.domain.Journal;
import com.wess.pilot.domain.JournalStatus;
import com.wess.pilot.dto.FeedbackDto;
import com.wess.pilot.dto.FeedbackRequest;
import com.wess.pilot.exception.ResourceNotFoundException;
import com.wess.pilot.repository.FeedbackRepository;
import com.wess.pilot.repository.JournalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final JournalRepository journalRepository;

    @Transactional(readOnly = true)
    public FeedbackDto get(Long journalId) {
        Feedback feedback = feedbackRepository.findByJournalId(journalId)
                .orElseThrow(() -> new ResourceNotFoundException("등록된 피드백이 없습니다. journalId=" + journalId));
        return FeedbackDto.from(feedback);
    }

    /** 피드백 등록/수정 → journal.status = REVIEWED */
    @Transactional
    public FeedbackDto save(Long journalId, FeedbackRequest request) {
        Journal journal = journalRepository.findById(journalId)
                .orElseThrow(() -> new ResourceNotFoundException("일지를 찾을 수 없습니다. id=" + journalId));

        if (journal.getStatus() == JournalStatus.WRITING) {
            throw new IllegalStateException("아직 제출되지 않은 일지에는 피드백을 등록할 수 없습니다.");
        }

        Feedback feedback = feedbackRepository.findByJournalId(journalId).orElseGet(() -> {
            Feedback f = new Feedback();
            f.setJournal(journal);
            return f;
        });

        feedback.setSupervisorName(request.getSupervisorName());
        feedback.setDate(request.getDate() != null ? request.getDate() : LocalDate.now());
        feedback.setContent(request.getContent());

        Feedback saved = feedbackRepository.save(feedback);

        journal.setStatus(JournalStatus.REVIEWED);
        journalRepository.save(journal);

        return FeedbackDto.from(saved);
    }
}
