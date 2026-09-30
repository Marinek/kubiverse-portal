package com.kubiverse.portal.server.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import lombok.ToString;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
@Configuration
@ConfigurationProperties(prefix = "secure-share")
public class SecureShareProperties {

    /**
     * Base64-encoded 256-bit master key (KEK). Intentionally without default.
     */
    @ToString.Exclude
    private String masterKey;

    private String masterKeyId = "k1";

    /**
     * Previous master key, kept during rotation until all shares encrypted with it have expired.
     */
    @ToString.Exclude
    private String previousMasterKey;

    private String previousMasterKeyId;

    @Valid
    private RateLimit rateLimit = new RateLimit();

    @Valid
    private Capacity capacity = new Capacity();

    @Data
    public static class RateLimit {
        @Positive
        private int createPerHour = 20;
        @Positive
        private int accessPerHour = 60;
    }

    @Data
    public static class Capacity {
        @Positive
        private int maxShares = 1000;
        @Positive
        private long maxTotalBytes = 1_073_741_824L;
    }
}
