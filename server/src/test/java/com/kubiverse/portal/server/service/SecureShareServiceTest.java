package com.kubiverse.portal.server.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.kubiverse.portal.server.TestClock;
import com.kubiverse.portal.server.entity.SecureShare;
import com.kubiverse.portal.server.entity.ShareType;
import com.kubiverse.portal.server.exception.RateLimitExceededException;
import com.kubiverse.portal.server.exception.ShareNotAvailableException;
import com.kubiverse.portal.server.exception.SharePasswordException;
import com.kubiverse.portal.server.exception.ShareTooLargeException;
import com.kubiverse.portal.server.exception.ShareValidationException;
import com.kubiverse.portal.server.repository.SecureShareRepository;
import com.kubiverse.portal.server.service.SecureShareService.CreateCommand;
import com.kubiverse.portal.server.service.SecureShareService.CreatedShare;
import com.kubiverse.portal.server.service.SecureShareService.RetrievedShare;
import com.kubiverse.portal.server.service.SecureShareService.ShareMetadata;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestClock.Config.class)
class SecureShareServiceTest {

    private static final AtomicInteger IP_COUNTER = new AtomicInteger();

    @Autowired
    private SecureShareService service;
    @Autowired
    private SecureShareRepository repository;
    @Autowired
    private TestClock clock;

    private String ip;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        clock.reset();
        ip = nextIp();
    }

    private static String nextIp() {
        int n = IP_COUNTER.incrementAndGet();
        return "10.20." + (n / 250) + "." + (n % 250 + 1);
    }

    private static CreateCommand text(String text, String expiresIn, String maxDownloads, String password) {
        return new CreateCommand(text, null, null, expiresIn, maxDownloads, password);
    }

    private static CreateCommand file(byte[] content, String name) {
        return new CreateCommand(null, content, name, null, null, null);
    }

    // --- create -----------------------------------------------------------------------------

    @Test
    void createsTextShareWithDefaults() {
        CreatedShare created = service.create(text("secret", null, null, null), ip);

        assertThat(ShareTokens.isWellFormed(created.token())).isTrue();
        assertThat(created.maxDownloads()).isEqualTo(1);
        assertThat(created.expiresAt()).isEqualTo(TestClock.START.plus(Duration.ofHours(24)));
    }

    @ParameterizedTest
    @MethodSource("expiryOptions")
    void mapsExpiryOptions(String option, Duration expected) {
        CreatedShare created = service.create(text("secret", option, null, null), ip);

        assertThat(created.expiresAt()).isEqualTo(TestClock.START.plus(expected));
    }

    static Stream<Arguments> expiryOptions() {
        return Stream.of(
                Arguments.of("1h", Duration.ofHours(1)),
                Arguments.of("24h", Duration.ofHours(24)),
                Arguments.of("3d", Duration.ofDays(3)),
                Arguments.of("7d", Duration.ofDays(7)));
    }

    @ParameterizedTest
    @MethodSource("invalidCommands")
    void rejectsInvalidInput(CreateCommand command, String field) {
        assertThatThrownBy(() -> service.create(command, ip))
                .isInstanceOf(ShareValidationException.class)
                .satisfies(e -> assertThat(((ShareValidationException) e).getFieldErrors())
                        .anyMatch(error -> error.startsWith(field + ":")));
        assertThat(repository.count()).isZero();
    }

    static Stream<Arguments> invalidCommands() {
        return Stream.of(
                Arguments.of(new CreateCommand("a", new byte[] {1}, "f", null, null, null), "content"),
                Arguments.of(new CreateCommand(null, null, null, null, null, null), "content"),
                Arguments.of(text("   ", null, null, null), "text"),
                Arguments.of(text("x".repeat(10_001), null, null, null), "text"),
                Arguments.of(file(new byte[0], "empty.txt"), "file"),
                Arguments.of(text("secret", "8d", null, null), "expiresIn"),
                Arguments.of(text("secret", "2h", null, null), "expiresIn"),
                Arguments.of(text("secret", null, "0", null), "maxDownloads"),
                Arguments.of(text("secret", null, "101", null), "maxDownloads"),
                Arguments.of(text("secret", null, "abc", null), "maxDownloads"),
                Arguments.of(text("secret", null, null, "short"), "password"),
                Arguments.of(text("secret", null, null, "p".repeat(129)), "password"));
    }

    @Test
    void acceptsBoundaryValues() {
        assertThat(service.create(text("x".repeat(10_000), null, "100", "p".repeat(128)), ip).maxDownloads())
                .isEqualTo(100);
        assertThat(service.create(text("x", null, "unlimited", "12345678"), ip).maxDownloads()).isNull();
        assertThat(service.create(file(new byte[(int) SecureShareService.MAX_FILE_BYTES], "big.bin"), ip))
                .isNotNull();
    }

    @Test
    void rejectsFileLargerThan10Mb() {
        byte[] tooLarge = new byte[(int) SecureShareService.MAX_FILE_BYTES + 1];

        assertThatThrownBy(() -> service.create(file(tooLarge, "big.bin"), ip))
                .isInstanceOf(ShareTooLargeException.class);
        assertThat(repository.count()).isZero();
    }

    @Test
    void storesNoPlaintext() {
        String secret = "super-secret-value";
        String password = "correct horse battery";
        CreatedShare textShare = service.create(text(secret, null, null, password), ip);
        service.create(file("file-content-xyz".getBytes(StandardCharsets.UTF_8), "geheim-report.txt"), ip);

        for (SecureShare share : repository.findAll()) {
            String stored = new String(share.getCiphertext(), StandardCharsets.ISO_8859_1)
                    + (share.getFilenameCiphertext() == null ? ""
                            : new String(share.getFilenameCiphertext(), StandardCharsets.ISO_8859_1))
                    + new String(share.getTokenHash(), StandardCharsets.ISO_8859_1)
                    + (share.getPasswordHash() == null ? "" : share.getPasswordHash());
            assertThat(stored).doesNotContain(secret, "file-content-xyz", "geheim-report", password,
                    textShare.token());
        }
    }

    @Test
    void enforcesCreateRateLimit() {
        for (int i = 0; i < 20; i++) {
            service.create(text("secret", null, null, null), ip);
        }
        assertThatThrownBy(() -> service.create(text("secret", null, null, null), ip))
                .isInstanceOf(RateLimitExceededException.class);
    }

    // --- lookup ----------------------------------------------------------------------------

    @Test
    void lookupReturnsMetadataWithoutConsuming() {
        CreatedShare created = service.create(text("secret", "3d", "2", "password1"), ip);

        ShareMetadata first = service.lookup(created.token(), ip);
        ShareMetadata second = service.lookup(created.token(), ip);

        assertThat(first.type()).isEqualTo(ShareType.TEXT);
        assertThat(first.passwordRequired()).isTrue();
        assertThat(first.expiresAt()).isEqualTo(created.expiresAt());
        assertThat(first.remainingDownloads()).isEqualTo(2);
        assertThat(second.remainingDownloads()).isEqualTo(2);
    }

    @Test
    void lookupTreatsUnknownMalformedAndExpiredAlike() {
        CreatedShare created = service.create(text("secret", "1h", null, null), ip);

        assertThatThrownBy(() -> service.lookup(ShareTokens.generate(), ip))
                .isInstanceOf(ShareNotAvailableException.class);
        assertThatThrownBy(() -> service.lookup("../../etc/passwd", ip))
                .isInstanceOf(ShareNotAvailableException.class);

        clock.advance(Duration.ofHours(1));
        assertThat(repository.count()).isEqualTo(1);
        assertThatThrownBy(() -> service.lookup(created.token(), ip))
                .isInstanceOf(ShareNotAvailableException.class);
        assertThatThrownBy(() -> service.retrieve(created.token(), null, ip))
                .isInstanceOf(ShareNotAvailableException.class);
    }

    // --- retrieve --------------------------------------------------------------------------

    @Test
    void burnAfterReadByDefault() {
        CreatedShare created = service.create(text("secret", null, null, null), ip);

        RetrievedShare retrieved = service.retrieve(created.token(), null, ip);

        assertThat(new String(retrieved.content(), StandardCharsets.UTF_8)).isEqualTo("secret");
        assertThat(retrieved.deleted()).isTrue();
        assertThat(repository.count()).isZero();
        assertThatThrownBy(() -> service.retrieve(created.token(), null, ip))
                .isInstanceOf(ShareNotAvailableException.class);
    }

    @Test
    void allowsExactlyConfiguredDownloads() {
        CreatedShare created = service.create(text("secret", null, "3", null), ip);

        assertThat(service.retrieve(created.token(), null, ip).deleted()).isFalse();
        assertThat(service.lookup(created.token(), ip).remainingDownloads()).isEqualTo(2);
        assertThat(service.retrieve(created.token(), null, ip).deleted()).isFalse();
        assertThat(service.retrieve(created.token(), null, ip).deleted()).isTrue();
        assertThatThrownBy(() -> service.retrieve(created.token(), null, ip))
                .isInstanceOf(ShareNotAvailableException.class);
    }

    @Test
    void unlimitedDownloadsUntilExpiry() {
        CreatedShare created = service.create(text("secret", "1h", "unlimited", null), ip);

        for (int i = 0; i < 5; i++) {
            assertThat(service.retrieve(created.token(), null, ip).deleted()).isFalse();
        }
        assertThat(service.lookup(created.token(), ip).remainingDownloads()).isNull();

        clock.advance(Duration.ofHours(1));
        assertThatThrownBy(() -> service.retrieve(created.token(), null, ip))
                .isInstanceOf(ShareNotAvailableException.class);
    }

    @Test
    void returnsFileWithSanitizedName() {
        byte[] content = {1, 2, 3, 4};
        CreatedShare created = service.create(file(content, "../../etc/pa\"ss\nwd.txt"), ip);

        RetrievedShare retrieved = service.retrieve(created.token(), null, ip);

        assertThat(retrieved.type()).isEqualTo(ShareType.FILE);
        assertThat(retrieved.content()).isEqualTo(content);
        assertThat(retrieved.filename()).isEqualTo("passwd.txt");
    }

    @Test
    void wrongPasswordDoesNotConsumeAndCorrectPasswordResetsCounter() {
        CreatedShare created = service.create(text("secret", null, "2", "password1"), ip);

        assertThatThrownBy(() -> service.retrieve(created.token(), "wrong-pass", ip))
                .isInstanceOf(SharePasswordException.class);
        assertThatThrownBy(() -> service.retrieve(created.token(), null, ip))
                .isInstanceOf(SharePasswordException.class);
        SecureShare afterFailures = repository.findAll().get(0);
        assertThat(afterFailures.getFailedPasswordAttempts()).isEqualTo(2);
        assertThat(afterFailures.getRemainingDownloads()).isEqualTo(2);

        service.retrieve(created.token(), "password1", ip);

        SecureShare afterSuccess = repository.findAll().get(0);
        assertThat(afterSuccess.getFailedPasswordAttempts()).isZero();
        assertThat(afterSuccess.getRemainingDownloads()).isEqualTo(1);
    }

    @Test
    void deletesAfterFiveFailedPasswordAttempts() {
        CreatedShare created = service.create(text("secret", null, "unlimited", "password1"), ip);

        for (int i = 0; i < SecureShareService.MAX_PASSWORD_ATTEMPTS; i++) {
            assertThatThrownBy(() -> service.retrieve(created.token(), "wrong-pass", ip))
                    .isInstanceOf(SharePasswordException.class);
        }

        assertThat(repository.count()).isZero();
        assertThatThrownBy(() -> service.retrieve(created.token(), "password1", ip))
                .isInstanceOf(ShareNotAvailableException.class);
    }

    @Test
    void concurrentRetrievalsDeliverAtMostOnce() throws Exception {
        CreatedShare created = service.create(text("secret", null, null, null), ip);
        int threads = 8;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        try {
            List<Callable<Boolean>> calls = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                String callerIp = nextIp();
                calls.add(() -> {
                    try {
                        service.retrieve(created.token(), null, callerIp);
                        return true;
                    } catch (ShareNotAvailableException e) {
                        return false;
                    }
                });
            }
            int successes = 0;
            for (Future<Boolean> result : executor.invokeAll(calls)) {
                if (result.get()) {
                    successes++;
                }
            }
            assertThat(successes).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }
}
