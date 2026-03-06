package com.kubiverse.portal.server.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kubiverse.portal.server.dto.argocd.ArgoCdApplicationResponseDto;
import com.kubiverse.portal.server.service.ArgoCdService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/argocd")
@RequiredArgsConstructor
public class ArgoCdController {

    private final ArgoCdService argoCdService;

    @GetMapping("/applications")
    public List<ArgoCdApplicationResponseDto> getApplications() {
        return argoCdService.getFrontendApplications();
    }
}
