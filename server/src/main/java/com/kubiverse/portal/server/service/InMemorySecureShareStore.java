package com.kubiverse.portal.server.service;

import com.kubiverse.portal.server.config.SecureShareProperties;
import com.kubiverse.portal.server.entity.SecureShare;
import com.kubiverse.portal.server.exception.ShareServiceUnavailableException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class InMemorySecureShareStore {

    private final Map<String, SecureShare> shares = new ConcurrentHashMap<>();
    private final Object capacityLock = new Object();
    private final SecureShareProperties.Capacity capacity;

    public InMemorySecureShareStore(SecureShareProperties properties) {
        this.capacity = properties.getCapacity();
    }

    public Optional<SecureShare> findByTokenHash(byte[] tokenHash) {
        return Optional.ofNullable(shares.get(key(tokenHash)));
    }

    public void save(SecureShare share) {
        synchronized (capacityLock) {
            String key = key(share.getTokenHash());
            if (shares.containsKey(key)) {
                throw new IllegalStateException("Duplicate secure share token hash");
            }
            long totalBytes = shares.values().stream().mapToLong(SecureShare::getSizeBytes).sum();
            if (shares.size() >= capacity.getMaxShares()
                    || totalBytes + share.getSizeBytes() > capacity.getMaxTotalBytes()) {
                throw new ShareServiceUnavailableException(ShareServiceUnavailableException.CAPACITY);
            }
            shares.put(key, share);
        }
    }

    public boolean delete(SecureShare share) {
        synchronized (capacityLock) {
            return shares.remove(key(share.getTokenHash()), share);
        }
    }

    public List<SecureShare> removeExpired(Instant now) {
        List<Map.Entry<String, SecureShare>> snapshot = new ArrayList<>(shares.entrySet());
        List<SecureShare> expired = new ArrayList<>();
        for (Map.Entry<String, SecureShare> entry : snapshot) {
            SecureShare share = entry.getValue();
            synchronized (share) {
                if (!share.getExpiresAt().isAfter(now)) {
                    synchronized (capacityLock) {
                        if (shares.remove(entry.getKey(), share)) {
                            expired.add(share);
                        }
                    }
                }
            }
        }
        return List.copyOf(expired);
    }

    public boolean contains(SecureShare share) {
        return shares.get(key(share.getTokenHash())) == share;
    }

    int size() {
        return shares.size();
    }

    long storedBytes() {
        return shares.values().stream().mapToLong(SecureShare::getSizeBytes).sum();
    }

    List<SecureShare> snapshot() {
        return List.copyOf(shares.values());
    }

    void clear() {
        synchronized (capacityLock) {
            shares.clear();
        }
    }

    private static String key(byte[] tokenHash) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenHash);
    }
}