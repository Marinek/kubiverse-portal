package com.kubiverse.portal.server.dto.argocd;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ArgoCdApplicationResponseDto {
    private String name;
    private String project;
    private String syncStatus;
    private String healthStatus;
    private String argocdUrl;
    private java.util.List<String> externalUrls;
}
