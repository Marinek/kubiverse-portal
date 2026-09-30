package com.kubiverse.portal.server.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

class SecureSharePropertiesTest {

    private SecureShareProperties bind(Map<String, String> values) {
        return new Binder(new MapConfigurationPropertySource(values))
                .bindOrCreate("secure-share", SecureShareProperties.class);
    }

    @Test
    void usesDefaults() {
        SecureShareProperties props = bind(Map.of());

        assertThat(props.getRateLimit().getCreatePerHour()).isEqualTo(20);
        assertThat(props.getRateLimit().getAccessPerHour()).isEqualTo(60);
        assertThat(props.getCapacity().getMaxShares()).isEqualTo(1000);
        assertThat(props.getCapacity().getMaxTotalBytes()).isEqualTo(1_073_741_824L);
        assertThat(props.getMasterKey()).isNull();
    }

    @Test
    void appliesOverrides() {
        SecureShareProperties props = bind(Map.of(
                "secure-share.rate-limit.create-per-hour", "5",
                "secure-share.rate-limit.access-per-hour", "7",
                "secure-share.capacity.max-shares", "10",
                "secure-share.capacity.max-total-bytes", "2048",
                "secure-share.master-key-id", "k2"));

        assertThat(props.getRateLimit().getCreatePerHour()).isEqualTo(5);
        assertThat(props.getRateLimit().getAccessPerHour()).isEqualTo(7);
        assertThat(props.getCapacity().getMaxShares()).isEqualTo(10);
        assertThat(props.getCapacity().getMaxTotalBytes()).isEqualTo(2048L);
        assertThat(props.getMasterKeyId()).isEqualTo("k2");
    }

    @Test
    void toStringDoesNotExposeKeys() {
        SecureShareProperties props = bind(Map.of(
                "secure-share.master-key", "c2VjcmV0LWtleQ==",
                "secure-share.previous-master-key", "b2xkLWtleQ=="));

        assertThat(props.toString()).doesNotContain("c2VjcmV0LWtleQ==").doesNotContain("b2xkLWtleQ==");
    }
}
