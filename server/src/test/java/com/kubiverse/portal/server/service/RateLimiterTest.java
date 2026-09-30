package com.kubiverse.portal.server.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.kubiverse.portal.server.config.SecureShareProperties;
import com.kubiverse.portal.server.exception.RateLimitExceededException;
import com.kubiverse.portal.server.service.AuditLogger.Action;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RateLimiterTest {

    private MutableClock clock;
    private AuditLogger audit;
    private RateLimiter limiter;

    @BeforeEach
    void setUp() {
        SecureShareProperties props = new SecureShareProperties();
        props.getRateLimit().setCreatePerHour(2);
        props.getRateLimit().setAccessPerHour(3);
        clock = new MutableClock(Instant.parse("2026-09-30T12:00:00Z"));
        audit = mock(AuditLogger.class);
        limiter = new RateLimiter(props, audit, clock);
    }

    @Test
    void rejectsAfterLimitWithRetryAfter() {
        limiter.check(Action.CREATE, "10.0.0.1");
        limiter.check(Action.CREATE, "10.0.0.1");
        clock.advance(Duration.ofMinutes(15));

        assertThatThrownBy(() -> limiter.check(Action.CREATE, "10.0.0.1"))
                .isInstanceOf(RateLimitExceededException.class)
                .extracting(e -> ((RateLimitExceededException) e).getRetryAfterSeconds())
                .isEqualTo(Duration.ofMinutes(45).toSeconds());
        verify(audit).rateLimited(Action.CREATE, "10.0.0.1");
    }

    @Test
    void resetsAfterWindow() {
        limiter.check(Action.CREATE, "10.0.0.1");
        limiter.check(Action.CREATE, "10.0.0.1");
        clock.advance(Duration.ofHours(1));

        assertThatNoException().isThrownBy(() -> limiter.check(Action.CREATE, "10.0.0.1"));
    }

    @Test
    void separatesActionsAndIps() {
        limiter.check(Action.CREATE, "10.0.0.1");
        limiter.check(Action.CREATE, "10.0.0.1");

        assertThatNoException().isThrownBy(() -> limiter.check(Action.CREATE, "10.0.0.2"));
        assertThatNoException().isThrownBy(() -> {
            limiter.check(Action.ACCESS, "10.0.0.1");
            limiter.check(Action.ACCESS, "10.0.0.1");
            limiter.check(Action.ACCESS, "10.0.0.1");
        });
        assertThatThrownBy(() -> limiter.check(Action.ACCESS, "10.0.0.1"))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void evictsExpiredWindows() {
        limiter.check(Action.CREATE, "10.0.0.1");
        limiter.check(Action.ACCESS, "10.0.0.2");
        clock.advance(Duration.ofHours(2));

        limiter.evictExpiredWindows();

        assertThat(limiter.trackedWindows()).isZero();
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
