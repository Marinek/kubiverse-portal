package com.kubiverse.portal.server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Persisted secure share. Content and filename are stored only as AES-GCM ciphertext;
 * the access token only as SHA-256 hash, the password only as BCrypt hash.
 */
@Entity
@Table(name = "secure_share", indexes = @Index(name = "idx_secure_share_expires_at", columnList = "expires_at"))
@Getter
@Setter
@NoArgsConstructor
public class SecureShare {

    public static final int MAX_CIPHERTEXT_BYTES = 10_485_760 + 16;

    @Id
    private UUID id;

    @Column(name = "token_hash", nullable = false, unique = true, length = 32)
    private byte[] tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private ShareType type;

    @Column(nullable = false, length = MAX_CIPHERTEXT_BYTES)
    private byte[] ciphertext;

    @Column(name = "content_iv", nullable = false, length = 12)
    private byte[] contentIv;

    @Column(name = "filename_ciphertext", length = 2048)
    private byte[] filenameCiphertext;

    @Column(name = "filename_iv", length = 12)
    private byte[] filenameIv;

    @Column(name = "wrapped_dek", nullable = false, length = 64)
    private byte[] wrappedDek;

    @Column(name = "dek_iv", nullable = false, length = 12)
    private byte[] dekIv;

    @Column(name = "key_id", nullable = false, length = 64)
    private String keyId;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Column(name = "failed_password_attempts", nullable = false)
    private int failedPasswordAttempts;

    /** {@code null} means unlimited. */
    @Column(name = "max_downloads")
    private Integer maxDownloads;

    /** {@code null} means unlimited. */
    @Column(name = "remaining_downloads")
    private Integer remainingDownloads;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
