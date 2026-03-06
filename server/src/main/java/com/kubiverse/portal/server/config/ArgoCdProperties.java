package com.kubiverse.portal.server.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "argocd")
public class ArgoCdProperties {

    /**
     * URL of the ArgoCD server (e.g., http://argocd-server or
     * https://argocd.example.com)
     */
    private String url = "http://argocd-server";

    /**
     * Authentication Token (API Key) to communicate with ArgoCD REST API.
     */
    private String apiKey;
}
