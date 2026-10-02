package com.kubiverse.portal.server.entity;

import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Volatile secure share. Content and filename are held only as AES-GCM ciphertext;
 * the access token only as SHA-256 hash, the password only as BCrypt hash.
 */
@Getter
@Setter
@NoArgsConstructor
public class SecureShare {

    public static final int MAX_CIPHERTEXT_BYTES = 10_485_760 + 16;

    private UUID id;

    private byte[] tokenHash;

    private ShareType type;

    private byte[] ciphertext;

    private byte[] contentIv;

    private byte[] filenameCiphertext;

    private byte[] filenameIv;

    private byte[] wrappedDek;

    private byte[] dekIv;

    private String keyId;

    private long sizeBytes;

    private String passwordHash;

    private int failedPasswordAttempts;

    /** {@code null} means unlimited. */
    private Integer maxDownloads;

    /** {@code null} means unlimited. */
    private Integer remainingDownloads;

    private Instant createdAt;

    private Instant expiresAt;
}
