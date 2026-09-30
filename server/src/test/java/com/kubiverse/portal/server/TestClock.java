package com.kubiverse.portal.server;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Controllable clock for tests; import via {@link Config}.
 */
public class TestClock extends Clock {

    public static final Instant START = Instant.parse("2026-09-30T12:00:00Z");

    private volatile Instant instant = START;

    public void reset() {
        instant = START;
    }

    public void advance(Duration duration) {
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

    @TestConfiguration
    public static class Config {
        @Bean
        @Primary
        public TestClock testClock() {
            return new TestClock();
        }
    }
}
