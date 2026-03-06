package com.kubiverse.portal.server.dto.argocd;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ArgoCdApplicationDto {

    private Metadata metadata;
    private Spec spec;
    private Status status;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Spec {
        private String project;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Metadata {
        private String name;
        private String namespace;
        private String uid;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Status {
        private Health health;
        private Sync sync;
        private Summary summary;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Summary {
        private java.util.List<String> externalURLs;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Health {
        private String status;
        private String message;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Sync {
        private String status;
        private String revision;
    }
}
