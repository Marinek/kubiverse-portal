package com.kubiverse.portal.server.repository;

import com.kubiverse.portal.server.entity.SecureShare;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SecureShareRepository extends JpaRepository<SecureShare, UUID> {

    Optional<SecureShare> findByTokenHash(byte[] tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SecureShare s where s.tokenHash = :tokenHash")
    Optional<SecureShare> findByTokenHashForUpdate(@Param("tokenHash") byte[] tokenHash);

    @Query("select s.id from SecureShare s where s.expiresAt <= :now")
    List<UUID> findExpiredIds(@Param("now") Instant now);

    @Query("select count(s) from SecureShare s where s.expiresAt > :now")
    long countActive(@Param("now") Instant now);

    @Query("select coalesce(sum(s.sizeBytes), 0) from SecureShare s where s.expiresAt > :now")
    long sumActiveSizeBytes(@Param("now") Instant now);
}
