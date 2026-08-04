package com.kubiverse.portal.server.controller;

import com.kubiverse.portal.server.dto.BootstrapRequest;
import com.kubiverse.portal.server.service.ProjectBootstrapService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/kubiverse/api/bootstrap")
@RequiredArgsConstructor
public class ProjectBootstrapController {

    private final ProjectBootstrapService projectBootstrapService;

    @PostMapping
    public ResponseEntity<?> bootstrapProject(@RequestBody BootstrapRequest request) {
        if (request.getProjectName() == null || request.getProjectName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Project name is required"));
        }

        try {
            projectBootstrapService.bootstrapProject(request.getProjectName().trim());
            return ResponseEntity.ok(Map.of("message", "Project bootstrapped successfully"));
        } catch (Exception e) {
            log.error("Bootstrap failed", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
