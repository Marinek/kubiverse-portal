package com.kubiverse.portal.server.service;

import com.kubiverse.portal.server.repository.SecureShareRepository;
import com.kubiverse.portal.server.service.AuditLogger.DeletionReason;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("!no-db")
@RequiredArgsConstructor
public class ShareCleanupJob {

    private final SecureShareRepository repository;
    private final AuditLogger audit;
    private final Clock clock;

    @Scheduled(fixedDelay = 60_000, initialDelay = 60_000)
    @Transactional
    public void deleteExpiredShares() {
        List<UUID> expired = repository.findExpiredIds(clock.instant());
        if (expired.isEmpty()) {
            return;
        }
        repository.deleteAllByIdInBatch(expired);
        expired.forEach(id -> audit.shareDeletedBySystem(id, DeletionReason.EXPIRED));
    }
}
