package com.kubiverse.portal.server.service;

import com.kubiverse.portal.server.service.AuditLogger.DeletionReason;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ShareCleanupJob {

    private final InMemorySecureShareStore store;
    private final AuditLogger audit;
    private final Clock clock;

    @Scheduled(fixedDelay = 60_000, initialDelay = 60_000)
    public void deleteExpiredShares() {
        store.removeExpired(clock.instant()).forEach(
                share -> audit.shareDeletedBySystem(share.getId(), DeletionReason.EXPIRED));
    }
}
