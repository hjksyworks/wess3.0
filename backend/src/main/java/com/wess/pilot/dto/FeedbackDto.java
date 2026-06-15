package com.wess.pilot.dto;

import com.wess.pilot.domain.Feedback;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackDto {

    private Long journalId;
    private String supervisorName;
    private LocalDate date;
    private String content;

    public static FeedbackDto from(Feedback feedback) {
        return new FeedbackDto(
                feedback.getJournal().getId(),
                feedback.getSupervisorName(),
                feedback.getDate(),
                feedback.getContent());
    }
}
