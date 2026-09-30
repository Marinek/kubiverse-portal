package com.kubiverse.portal.server.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.kubiverse.portal.server.entity.SecureShare;
import com.kubiverse.portal.server.entity.ShareType;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class SecureShareRepositoryTest {

    @Autowired
    private SecureShareRepository repository;

    private SecureShare share(byte[] tokenHash, long size, Instant expiresAt) {
        SecureShare share = new SecureShare();
        share.setId(UUID.randomUUID());
        share.setTokenHash(tokenHash);
        share.setType(ShareType.FILE);
        share.setCiphertext(new byte[(int) size + 16]);
        share.setContentIv(new byte[12]);
        share.setFilenameCiphertext(new byte[20]);
        share.setFilenameIv(new byte[12]);
        share.setWrappedDek(new byte[48]);
        share.setDekIv(new byte[12]);
        share.setKeyId("k1");
        share.setSizeBytes(size);
        share.setMaxDownloads(1);
        share.setRemainingDownloads(1);
        share.setCreatedAt(Instant.now());
        share.setExpiresAt(expiresAt);
        return share;
    }

    private static byte[] hash(int seed) {
        byte[] hash = new byte[32];
        hash[0] = (byte) seed;
        return hash;
    }

    @Test
    void storesAndFindsByTokenHash() {
        SecureShare saved = repository.saveAndFlush(share(hash(1), 100, Instant.now().plus(1, ChronoUnit.HOURS)));

        assertThat(repository.findByTokenHash(hash(1))).get().extracting(SecureShare::getId).isEqualTo(saved.getId());
        assertThat(repository.findByTokenHash(hash(2))).isEmpty();
    }

    @Test
    void findsByTokenHashForUpdate() {
        SecureShare saved = repository.saveAndFlush(share(hash(3), 10, Instant.now().plus(1, ChronoUnit.HOURS)));

        assertThat(repository.findByTokenHashForUpdate(hash(3))).get()
                .extracting(SecureShare::getId).isEqualTo(saved.getId());
    }

    @Test
    void aggregatesOnlyActiveShares() {
        Instant now = Instant.now();
        repository.save(share(hash(4), 100, now.plus(1, ChronoUnit.HOURS)));
        repository.save(share(hash(5), 200, now.plus(2, ChronoUnit.HOURS)));
        SecureShare expired = repository.save(share(hash(6), 400, now.minus(1, ChronoUnit.MINUTES)));
        repository.flush();

        assertThat(repository.countActive(now)).isEqualTo(2);
        assertThat(repository.sumActiveSizeBytes(now)).isEqualTo(300);
        assertThat(repository.findExpiredIds(now)).containsExactly(expired.getId());
    }

    @Test
    void sumIsZeroWithoutShares() {
        assertThat(repository.sumActiveSizeBytes(Instant.now())).isZero();
    }
}
