package com.wess.pilot.controller;

import com.wess.pilot.dto.FeedbackDto;
import com.wess.pilot.dto.FeedbackRequest;
import com.wess.pilot.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/journals/{journalId}/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @GetMapping
    public FeedbackDto get(@PathVariable Long journalId) {
        return feedbackService.get(journalId);
    }

    @PostMapping
    public FeedbackDto save(@PathVariable Long journalId, @Valid @RequestBody FeedbackRequest request) {
        return feedbackService.save(journalId, request);
    }
}
