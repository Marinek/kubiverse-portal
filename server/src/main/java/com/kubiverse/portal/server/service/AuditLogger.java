package com.kubiverse.portal.server.service;

import com.kubiverse.portal.server.entity.ShareType;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Writes structured secure share audit events to the {@code AUDIT} logger. Accepts only typed,
 * non-confidential fields so that content, filenames, passwords and tokens cannot be logged.
 */
@Component
@RequiredArgsConstructor
public class AuditLogger {

    private static final Logger AUDIT = LoggerFactory.getLogger("AUDIT");
    private static final Pattern IP_CHARS = Pattern.compile("^[0-9A-Fa-f.:]{1,45}$");
    private static final String SYSTEM = "system";

    private final Clock clock;

    public enum DeletionReason {
        EXPIRED, CONSUMED, PASSWORD_ATTEMPTS
    }

    public enum Action {
        CREATE, ACCESS
    }

    public void shareCreated(UUID shareId, ShareType type, long sizeBytes, Instant expiresAt,
            Integer maxDownloads, boolean passwordProtected, String clientIp) {
        write("SHARE_CREATED", clientIp,
                "shareId=" + shareId,
                "type=" + type,
                "sizeBytes=" + sizeBytes,
                "expiresAt=" + expiresAt,
                "maxDownloads=" + downloads(maxDownloads),
                "passwordProtected=" + passwordProtected);
    }

    public void shareRetrieved(UUID shareId, Integer remainingDownloads, String clientIp) {
        write("SHARE_RETRIEVED", clientIp,
                "shareId=" + shareId,
                "remainingDownloads=" + downloads(remainingDownloads));
    }

    public void passwordFailed(UUID shareId, int failedAttempts, String clientIp) {
        write("SHARE_PASSWORD_FAILED", clientIp,
                "shareId=" + shareId,
                "failedAttempts=" + failedAttempts);
    }

    public void shareDeleted(UUID shareId, DeletionReason reason, String clientIp) {
        write("SHARE_DELETED", clientIp,
                "shareId=" + shareId,
                "reason=" + reason);
    }

    public void shareDeletedBySystem(UUID shareId, DeletionReason reason) {
        shareDeleted(shareId, reason, SYSTEM);
    }

    public void shareNotAvailable(String clientIp) {
        write("SHARE_NOT_AVAILABLE", clientIp);
    }

    public void rateLimited(Action action, String clientIp) {
        write("RATE_LIMITED", clientIp, "action=" + action);
    }

    public void capacityExceeded(String clientIp) {
        write("CAPACITY_EXCEEDED", clientIp);
    }

    private void write(String event, String clientIp, String... fields) {
        StringBuilder line = new StringBuilder()
                .append("timestamp=").append(Instant.now(clock))
                .append(" event=").append(event);
        for (String field : fields) {
            line.append(' ').append(field);
        }
        line.append(" clientIp=").append(sanitizeIp(clientIp));
        AUDIT.info(line.toString());
    }

    private static String downloads(Integer value) {
        return value == null ? "unlimited" : value.toString();
    }

    private static String sanitizeIp(String ip) {
        if (SYSTEM.equals(ip)) {
            return SYSTEM;
        }
        return ip != null && IP_CHARS.matcher(ip).matches() ? ip : "invalid";
    }
}
