package com.kubiverse.portal.server.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ShareTokensTest {

    @Test
    void generatesUrlSafeTokensOf43Characters() {
        String token = ShareTokens.generate();

        assertThat(token).hasSize(43).matches("[A-Za-z0-9_-]+");
        assertThat(ShareTokens.isWellFormed(token)).isTrue();
    }

    @Test
    void generatesUniqueTokens() {
        Set<String> tokens = new HashSet<>();
        for (int i = 0; i < 10_000; i++) {
            tokens.add(ShareTokens.generate());
        }
        assertThat(tokens).hasSize(10_000);
    }

    @Test
    void hashIsDeterministicAndDiffersPerToken() {
        String token = ShareTokens.generate();

        assertThat(ShareTokens.hash(token)).hasSize(32).isEqualTo(ShareTokens.hash(token));
        assertThat(ShareTokens.hash(token)).isNotEqualTo(ShareTokens.hash(ShareTokens.generate()));
    }

    @Test
    void rejectsMalformedTokens() {
        assertThat(ShareTokens.isWellFormed(null)).isFalse();
        assertThat(ShareTokens.isWellFormed("short")).isFalse();
        assertThat(ShareTokens.isWellFormed("a".repeat(42) + "/")).isFalse();
    }
}
