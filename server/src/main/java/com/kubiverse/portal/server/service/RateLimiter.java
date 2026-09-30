package com.kubiverse.portal.server.service;

import com.kubiverse.portal.server.config.SecureShareProperties;
import com.kubiverse.portal.server.exception.RateLimitExceededException;
import com.kubiverse.portal.server.service.AuditLogger.Action;
import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * In-memory fixed-window rate limiter per client IP and action. Limits apply per instance.
 */
@Component
@RequiredArgsConstructor
public class RateLimiter {

    private static final long WINDOW_MILLIS = Duration.ofHours(1).toMillis();

    private final SecureShareProperties properties;
    private final AuditLogger auditLogger;
    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    private record Window(long start, int count) {
    }

    public void check(Action action, String clientIp) {
        long now = clock.millis();
        int limit = limitFor(action);
        Window window = windows.compute(action + "|" + clientIp, (key, current) -> {
            if (current == null || now - current.start() >= WINDOW_MILLIS) {
                return new Window(now, 1);
            }
            return new Window(current.start(), current.count() + 1);
        });

        if (window.count() > limit) {
            auditLogger.rateLimited(action, clientIp);
            long retryAfterMillis = window.start() + WINDOW_MILLIS - now;
            throw new RateLimitExceededException(Math.max(1, (retryAfterMillis + 999) / 1000));
        }
    }

    @Scheduled(fixedDelay = 600_000)
    public void evictExpiredWindows() {
        long now = clock.millis();
        windows.values().removeIf(window -> now - window.start() >= WINDOW_MILLIS);
    }

    int trackedWindows() {
        return windows.size();
    }

    private int limitFor(Action action) {
        return switch (action) {
            case CREATE -> properties.getRateLimit().getCreatePerHour();
            case ACCESS -> properties.getRateLimit().getAccessPerHour();
        };
    }
}
