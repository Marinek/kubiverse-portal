package com.kubiverse.portal.server.service;

import com.kubiverse.portal.server.entity.SecureShare;
import com.kubiverse.portal.server.entity.ShareType;
import com.kubiverse.portal.server.exception.ShareNotAvailableException;
import com.kubiverse.portal.server.exception.SharePasswordException;
import com.kubiverse.portal.server.exception.ShareServiceUnavailableException;
import com.kubiverse.portal.server.exception.ShareTooLargeException;
import com.kubiverse.portal.server.exception.ShareValidationException;
import com.kubiverse.portal.server.service.AuditLogger.Action;
import com.kubiverse.portal.server.service.AuditLogger.DeletionReason;
import com.kubiverse.portal.server.service.ShareCryptoService.DataKey;
import com.kubiverse.portal.server.service.ShareCryptoService.Purpose;
import com.kubiverse.portal.server.service.ShareCryptoService.Sealed;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class SecureShareService {

    public static final long MAX_FILE_BYTES = 10_485_760L;
    public static final int MAX_TEXT_CHARS = 10_000;
    public static final int MAX_PASSWORD_ATTEMPTS = 5;
    private static final int MIN_PASSWORD_CHARS = 8;
    private static final int MAX_PASSWORD_CHARS = 128;
    private static final int MAX_DOWNLOADS = 100;
    private static final int MAX_FILENAME_CHARS = 255;
    private static final String DEFAULT_EXPIRY = "24h";
    private static final String UNLIMITED = "unlimited";
    private static final Map<String, Duration> EXPIRY_OPTIONS = Map.of(
            "1h", Duration.ofHours(1),
            "24h", Duration.ofHours(24),
            "3d", Duration.ofDays(3),
            "7d", Duration.ofDays(7));

    private final InMemorySecureShareStore store;
    private final ShareCryptoService crypto;
    private final RateLimiter rateLimiter;
    private final AuditLogger audit;
    private final Clock clock;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public SecureShareService(InMemorySecureShareStore store, ShareCryptoService crypto, RateLimiter rateLimiter,
            AuditLogger audit, Clock clock) {
        this.store = store;
        this.crypto = crypto;
        this.rateLimiter = rateLimiter;
        this.audit = audit;
        this.clock = clock;
    }

    /** {@code text} or {@code file} (with {@code filename}) must be set, not both. */
    public record CreateCommand(String text, byte[] file, String filename, String expiresIn, String maxDownloads,
            String password) {
    }

    public record CreatedShare(String token, Instant expiresAt, Integer maxDownloads) {
    }

    public record ShareMetadata(ShareType type, boolean passwordRequired, Instant expiresAt,
            Integer remainingDownloads) {
    }

    public record RetrievedShare(ShareType type, byte[] content, String filename, boolean deleted) {
    }

    public CreatedShare create(CreateCommand command, String clientIp) {
        rateLimiter.check(Action.CREATE, clientIp);

        List<String> errors = new ArrayList<>();
        boolean hasText = command.text() != null;
        boolean hasFile = command.file() != null;
        if (hasText && hasFile) {
            errors.add("content: provide either text or file, not both");
        } else if (!hasText && !hasFile) {
            errors.add("content: text or file is required");
        } else if (hasText) {
            if (command.text().isBlank()) {
                errors.add("text: must not be empty");
            } else if (command.text().length() > MAX_TEXT_CHARS) {
                errors.add("text: must not exceed " + MAX_TEXT_CHARS + " characters");
            }
        } else if (command.file().length == 0) {
            errors.add("file: must not be empty");
        } else if (command.file().length > MAX_FILE_BYTES) {
            throw new ShareTooLargeException();
        }

        Duration expiry = parseExpiry(command.expiresIn(), errors);
        Integer maxDownloads = parseMaxDownloads(command.maxDownloads(), errors);
        String password = emptyToNull(command.password());
        if (password != null && (password.length() < MIN_PASSWORD_CHARS || password.length() > MAX_PASSWORD_CHARS)) {
            errors.add("password: must be between " + MIN_PASSWORD_CHARS + " and " + MAX_PASSWORD_CHARS
                    + " characters");
        }
        if (!errors.isEmpty()) {
            throw new ShareValidationException(errors);
        }

        ShareType type = hasText ? ShareType.TEXT : ShareType.FILE;
        byte[] content = hasText ? command.text().getBytes(StandardCharsets.UTF_8) : command.file();
        Instant now = clock.instant();

        UUID id = UUID.randomUUID();
        String token = ShareTokens.generate();
        DataKey dataKey = crypto.newDataKey(id);
        try {
            SecureShare share = new SecureShare();
            share.setId(id);
            share.setTokenHash(ShareTokens.hash(token));
            share.setType(type);
            Sealed sealedContent = crypto.encrypt(dataKey.key(), content, id, Purpose.CONTENT);
            share.setCiphertext(sealedContent.ciphertext());
            share.setContentIv(sealedContent.iv());
            if (type == ShareType.FILE) {
                Sealed sealedName = crypto.encrypt(dataKey.key(),
                        sanitizeFilename(command.filename()).getBytes(StandardCharsets.UTF_8), id, Purpose.FILENAME);
                share.setFilenameCiphertext(sealedName.ciphertext());
                share.setFilenameIv(sealedName.iv());
            }
            share.setWrappedDek(dataKey.wrappedKey());
            share.setDekIv(dataKey.iv());
            share.setKeyId(dataKey.keyId());
            share.setSizeBytes(content.length);
            share.setPasswordHash(password == null ? null : passwordEncoder.encode(prehash(password)));
            share.setMaxDownloads(maxDownloads);
            share.setRemainingDownloads(maxDownloads);
            share.setCreatedAt(now);
            share.setExpiresAt(now.plus(expiry));
            cleanupExpired(now);
            try {
                store.save(share);
            } catch (ShareServiceUnavailableException exception) {
                audit.capacityExceeded(clientIp);
                throw exception;
            }

            audit.shareCreated(id, type, content.length, share.getExpiresAt(), maxDownloads, password != null,
                    clientIp);
            return new CreatedShare(token, share.getExpiresAt(), maxDownloads);
        } finally {
            Arrays.fill(dataKey.key(), (byte) 0);
        }
    }

    public ShareMetadata lookup(String token, String clientIp) {
        rateLimiter.check(Action.ACCESS, clientIp);
        SecureShare share = findAvailable(token, clientIp);
        synchronized (share) {
            ensureAvailable(share, clientIp);
            return new ShareMetadata(share.getType(), share.getPasswordHash() != null, share.getExpiresAt(),
                    share.getRemainingDownloads());
        }
    }

    public RetrievedShare retrieve(String token, String password, String clientIp) {
        rateLimiter.check(Action.ACCESS, clientIp);
        SecureShare share = findAvailable(token, clientIp);
        synchronized (share) {
            ensureAvailable(share, clientIp);

            if (share.getPasswordHash() != null) {
                String given = emptyToNull(password);
                if (given == null || !passwordEncoder.matches(prehash(given), share.getPasswordHash())) {
                    int attempts = share.getFailedPasswordAttempts() + 1;
                    audit.passwordFailed(share.getId(), attempts, clientIp);
                    if (attempts >= MAX_PASSWORD_ATTEMPTS) {
                        store.delete(share);
                        audit.shareDeleted(share.getId(), DeletionReason.PASSWORD_ATTEMPTS, clientIp);
                    } else {
                        share.setFailedPasswordAttempts(attempts);
                    }
                    throw new SharePasswordException();
                }
                share.setFailedPasswordAttempts(0);
            }

            byte[] dek = crypto.unwrapDataKey(share.getKeyId(), share.getWrappedDek(), share.getDekIv(),
                    share.getId());
            byte[] content;
            String filename = null;
            try {
                content = crypto.decrypt(dek, new Sealed(share.getCiphertext(), share.getContentIv()), share.getId(),
                        Purpose.CONTENT);
                if (share.getType() == ShareType.FILE) {
                    filename = new String(crypto.decrypt(dek,
                            new Sealed(share.getFilenameCiphertext(), share.getFilenameIv()), share.getId(),
                            Purpose.FILENAME), StandardCharsets.UTF_8);
                }
            } finally {
                Arrays.fill(dek, (byte) 0);
            }

            Integer remaining = share.getRemainingDownloads();
            boolean consumed = false;
            if (remaining != null) {
                remaining = remaining - 1;
                share.setRemainingDownloads(remaining);
                consumed = remaining <= 0;
            }
            audit.shareRetrieved(share.getId(), remaining, clientIp);
            if (consumed) {
                store.delete(share);
                audit.shareDeleted(share.getId(), DeletionReason.CONSUMED, clientIp);
            }
            return new RetrievedShare(share.getType(), content, filename, consumed);
        }
    }

    private SecureShare findAvailable(String token, String clientIp) {
        Optional<SecureShare> share = Optional.empty();
        if (ShareTokens.isWellFormed(token)) {
            byte[] hash = ShareTokens.hash(token);
            share = store.findByTokenHash(hash);
        }
        if (share.isEmpty()) {
            audit.shareNotAvailable(clientIp);
            throw new ShareNotAvailableException();
        }
        return share.get();
    }

    private void ensureAvailable(SecureShare share, String clientIp) {
        if (!store.contains(share) || !share.getExpiresAt().isAfter(clock.instant())) {
            audit.shareNotAvailable(clientIp);
            throw new ShareNotAvailableException();
        }
    }

    private void cleanupExpired(Instant now) {
        store.removeExpired(now).forEach(
                share -> audit.shareDeletedBySystem(share.getId(), DeletionReason.EXPIRED));
    }

    private static Duration parseExpiry(String value, List<String> errors) {
        String key = emptyToNull(value) == null ? DEFAULT_EXPIRY : value.trim();
        Duration duration = EXPIRY_OPTIONS.get(key);
        if (duration == null) {
            errors.add("expiresIn: must be one of 1h, 24h, 3d, 7d");
        }
        return duration;
    }

    private static Integer parseMaxDownloads(String value, List<String> errors) {
        if (emptyToNull(value) == null) {
            return 1;
        }
        if (UNLIMITED.equals(value.trim())) {
            return null;
        }
        try {
            int parsed = Integer.parseInt(value.trim());
            if (parsed >= 1 && parsed <= MAX_DOWNLOADS) {
                return parsed;
            }
        } catch (NumberFormatException ignored) {
            // reported below
        }
        errors.add("maxDownloads: must be a number from 1 to " + MAX_DOWNLOADS + " or 'unlimited'");
        return 1;
    }

    static String sanitizeFilename(String original) {
        String name = original == null ? "" : original;
        name = name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1);
        name = name.replaceAll("[\\p{Cntrl}\"]", "").strip();
        if (name.length() > MAX_FILENAME_CHARS) {
            name = name.substring(0, MAX_FILENAME_CHARS);
        }
        return name.isEmpty() || name.equals(".") || name.equals("..") ? "download" : name;
    }

    /** SHA-256 before BCrypt so that passwords longer than BCrypt's 72-byte limit are fully used. */
    private static String prehash(String password) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(password.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private static String emptyToNull(String value) {
        return value == null || value.isEmpty() ? null : value;
    }
}
