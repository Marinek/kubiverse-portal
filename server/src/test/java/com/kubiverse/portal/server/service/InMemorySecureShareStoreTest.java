package com.kubiverse.portal.server.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.kubiverse.portal.server.config.SecureShareProperties;
import com.kubiverse.portal.server.entity.SecureShare;
import com.kubiverse.portal.server.exception.ShareServiceUnavailableException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;

class InMemorySecureShareStoreTest {

    @Test
    void findsShareByTokenHash() {
        InMemorySecureShareStore store = store(2, 100);
        SecureShare share = share(new byte[] {1, 2, 3}, 5);

        store.save(share);

        assertThat(store.findByTokenHash(new byte[] {1, 2, 3})).containsSame(share);
        assertThat(store.size()).isEqualTo(1);
        assertThat(store.storedBytes()).isEqualTo(5);
    }

    @Test
    void enforcesShareAndPayloadLimits() {
        InMemorySecureShareStore shareLimited = store(1, 100);
        shareLimited.save(share(new byte[] {1}, 5));
        assertCapacityExceeded(() -> shareLimited.save(share(new byte[] {2}, 1)));

        InMemorySecureShareStore byteLimited = store(2, 5);
        byteLimited.save(share(new byte[] {1}, 5));
        assertCapacityExceeded(() -> byteLimited.save(share(new byte[] {2}, 1)));
    }

    @Test
    void concurrentSavesCannotExceedShareLimit() throws Exception {
        InMemorySecureShareStore store = store(1, 100);
        int attempts = 16;
        CountDownLatch ready = new CountDownLatch(attempts);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(attempts);
        try {
            List<Future<Boolean>> results = new ArrayList<>();
            for (int index = 0; index < attempts; index++) {
                byte[] tokenHash = new byte[] {(byte) index};
                results.add(executor.submit(() -> {
                    ready.countDown();
                    start.await();
                    try {
                        store.save(share(tokenHash, 1));
                        return true;
                    } catch (ShareServiceUnavailableException exception) {
                        return false;
                    }
                }));
            }
            ready.await();
            start.countDown();

            assertThat(results.stream().filter(result -> get(result)).count()).isEqualTo(1);
            assertThat(store.size()).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    private static boolean get(Future<Boolean> result) {
        try {
            return result.get();
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    private static void assertCapacityExceeded(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action)
                .isInstanceOf(ShareServiceUnavailableException.class)
                .hasMessage(ShareServiceUnavailableException.CAPACITY);
    }

    private static InMemorySecureShareStore store(int maxShares, long maxBytes) {
        SecureShareProperties properties = new SecureShareProperties();
        properties.getCapacity().setMaxShares(maxShares);
        properties.getCapacity().setMaxTotalBytes(maxBytes);
        return new InMemorySecureShareStore(properties);
    }

    private static SecureShare share(byte[] tokenHash, long sizeBytes) {
        SecureShare share = new SecureShare();
        share.setTokenHash(tokenHash);
        share.setSizeBytes(sizeBytes);
        return share;
    }
}