package com.kubiverse.portal.server.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.kubiverse.portal.server.entity.ShareType;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
class AuditLoggerTest {

    private final Instant now = Instant.parse("2026-09-30T12:00:00Z");
    private final AuditLogger audit = new AuditLogger(Clock.fixed(now, ZoneOffset.UTC));

    @Test
    void logsShareCreatedWithAllFields(CapturedOutput output) {
        UUID id = UUID.randomUUID();
        audit.shareCreated(id, ShareType.FILE, 1234, now.plusSeconds(3600), 1, true, "10.0.0.1");

        assertThat(output).contains("AUDIT")
                .contains("timestamp=2026-09-30T12:00:00Z event=SHARE_CREATED shareId=" + id
                        + " type=FILE sizeBytes=1234 expiresAt=2026-09-30T13:00:00Z maxDownloads=1"
                        + " passwordProtected=true clientIp=10.0.0.1");
    }

    @Test
    void logsUnlimitedDownloadsAndDeletionReasons(CapturedOutput output) {
        UUID id = UUID.randomUUID();
        audit.shareRetrieved(id, null, "::1");
        audit.shareDeletedBySystem(id, AuditLogger.DeletionReason.EXPIRED);
        audit.passwordFailed(id, 3, "10.0.0.2");

        assertThat(output)
                .contains("event=SHARE_RETRIEVED shareId=" + id + " remainingDownloads=unlimited clientIp=::1")
                .contains("event=SHARE_DELETED shareId=" + id + " reason=EXPIRED clientIp=system")
                .contains("event=SHARE_PASSWORD_FAILED shareId=" + id + " failedAttempts=3 clientIp=10.0.0.2");
    }

    @Test
    void logsEventsWithoutShareId(CapturedOutput output) {
        audit.shareNotAvailable("10.0.0.3");
        audit.rateLimited(AuditLogger.Action.ACCESS, "10.0.0.3");
        audit.capacityExceeded("10.0.0.3");

        assertThat(output)
                .contains("event=SHARE_NOT_AVAILABLE clientIp=10.0.0.3")
                .contains("event=RATE_LIMITED action=ACCESS clientIp=10.0.0.3")
                .contains("event=CAPACITY_EXCEEDED clientIp=10.0.0.3");
    }

    @Test
    void neutralizesInjectedClientIp(CapturedOutput output) {
        audit.shareNotAvailable("1.2.3.4\nevent=FAKE");

        assertThat(output).contains("event=SHARE_NOT_AVAILABLE clientIp=invalid").doesNotContain("event=FAKE");
    }
}
