package com.kubiverse.portal.server.service;

import com.kubiverse.portal.server.config.ArgoCdProperties;
import com.kubiverse.portal.server.dto.argocd.ArgoCdApplicationListDto;
import com.kubiverse.portal.server.dto.argocd.ArgoCdApplicationResponseDto;
import com.kubiverse.portal.server.exception.ArgoCdIntegrationException;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArgoCdService {

    private final RestClient argocdRestClient;
    private final ArgoCdProperties argoCdProperties;

    /**
     * Retrieves the list of all applications from ArgoCD.
     * 
     * @return ArgoCdApplicationListDto containing the applications mapping
     */
    public ArgoCdApplicationListDto getApplications() {
        log.info("Fetching applications from ArgoCD API");

        try {
            return argocdRestClient.get()
                    .uri("/api/v1/applications")
                    .retrieve()
                    .body(ArgoCdApplicationListDto.class);
        } catch (RestClientResponseException e) {
            log.error("Failed to fetch applications from ArgoCD: Status {} - {}", e.getStatusCode(),
                    e.getResponseBodyAsString());
            throw new ArgoCdIntegrationException(
                    "Failed to fetch applications from ArgoCD. Status: " + e.getStatusCode(), e);
        } catch (Exception e) {
            log.error("Unexpected error communicating with ArgoCD: {}", e.getMessage());
            throw new ArgoCdIntegrationException("Unexpected error communicating with ArgoCD", e);
        }
    }

    /**
     * Retrieves the list of applications mapped for the frontend UI.
     * Extracts relevant properties and constructs direct navigation URLs.
     * 
     * @return List of mapped frontend DTOs
     */
    public List<ArgoCdApplicationResponseDto> getFrontendApplications() {
        ArgoCdApplicationListDto rawList = getApplications();
        String baseUrl = argoCdProperties.getUrl();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }

        final String formattedBaseUrl = baseUrl;

        return rawList.getItems().stream()
                .map(app -> {
                    String name = app.getMetadata() != null ? app.getMetadata().getName() : "unknown";
                    String project = app.getSpec() != null && app.getSpec().getProject() != null
                            ? app.getSpec().getProject()
                            : "default";
                    String syncStatus = app.getStatus() != null && app.getStatus().getSync() != null
                            ? app.getStatus().getSync().getStatus()
                            : "Unknown";
                    String healthStatus = app.getStatus() != null && app.getStatus().getHealth() != null
                            ? app.getStatus().getHealth().getStatus()
                            : "Unknown";

                    String argocdUrl = String.format("%s/applications/%s", formattedBaseUrl, name);

                    java.util.List<String> externalUrls = app.getStatus() != null
                            && app.getStatus().getSummary() != null
                            && app.getStatus().getSummary().getExternalURLs() != null
                                    ? app.getStatus().getSummary().getExternalURLs()
                                    : java.util.Collections.emptyList();

                    return ArgoCdApplicationResponseDto.builder()
                            .name(name)
                            .project(project)
                            .syncStatus(syncStatus)
                            .healthStatus(healthStatus)
                            .argocdUrl(argocdUrl)
                            .externalUrls(externalUrls)
                            .build();
                })
                .collect(Collectors.toList());
    }
}
