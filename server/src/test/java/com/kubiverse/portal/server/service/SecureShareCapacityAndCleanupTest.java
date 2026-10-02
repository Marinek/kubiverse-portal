package com.kubiverse.portal.server.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.kubiverse.portal.server.TestClock;
import com.kubiverse.portal.server.exception.ShareServiceUnavailableException;
import com.kubiverse.portal.server.service.SecureShareService.CreateCommand;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
    "secure-share.master-key=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    "secure-share.master-key-id=test-k1",
        "secure-share.capacity.max-shares=2",
        "secure-share.capacity.max-total-bytes=100"
})
@Import(TestClock.Config.class)
@ExtendWith(OutputCaptureExtension.class)
class SecureShareCapacityAndCleanupTest {

    @Autowired
    private SecureShareService service;
    @Autowired
    private ShareCleanupJob cleanupJob;
    @Autowired
    private InMemorySecureShareStore store;
    @Autowired
    private TestClock clock;

    @BeforeEach
    void setUp() {
        store.clear();
        clock.reset();
    }

    private static CreateCommand text(String text, String expiresIn) {
        return new CreateCommand(text, null, null, expiresIn, null, null);
    }

    @Test
    void rejectsWhenMaxSharesReached(CapturedOutput output) {
        service.create(text("a", null), "10.30.0.1");
        service.create(text("b", null), "10.30.0.1");

        assertThatThrownBy(() -> service.create(text("c", null), "10.30.0.1"))
                .isInstanceOf(ShareServiceUnavailableException.class)
                .hasMessage(ShareServiceUnavailableException.CAPACITY);
        assertThat(output).contains("event=CAPACITY_EXCEEDED clientIp=10.30.0.1");
    }

    @Test
    void rejectsWhenTotalBytesWouldBeExceeded() {
        service.create(text("x".repeat(60), null), "10.30.0.2");

        assertThatThrownBy(() -> service.create(text("y".repeat(41), null), "10.30.0.2"))
                .isInstanceOf(ShareServiceUnavailableException.class);
    }

    @Test
    void expiredSharesDoNotCountTowardsCapacity() {
        service.create(text("a", "1h"), "10.30.0.3");
        service.create(text("b", "1h"), "10.30.0.3");
        clock.advance(Duration.ofHours(1));

        assertThat(service.create(text("c", null), "10.30.0.3")).isNotNull();
    }

    @Test
    void cleanupDeletesOnlyExpiredSharesAndAudits(CapturedOutput output) {
        service.create(text("short", "1h"), "10.30.0.4");
        service.create(text("long", "24h"), "10.30.0.4");
        clock.advance(Duration.ofMinutes(61));

        cleanupJob.deleteExpiredShares();

        assertThat(store.size()).isEqualTo(1);
        assertThat(store.snapshot().get(0).getExpiresAt()).isEqualTo(TestClock.START.plus(Duration.ofHours(24)));
        assertThat(output).containsOnlyOnce("reason=EXPIRED clientIp=system");
    }
}
