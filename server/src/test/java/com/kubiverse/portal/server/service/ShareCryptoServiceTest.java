package com.kubiverse.portal.server.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.kubiverse.portal.server.config.SecureShareProperties;
import com.kubiverse.portal.server.service.ShareCryptoService.DataKey;
import com.kubiverse.portal.server.service.ShareCryptoService.Purpose;
import com.kubiverse.portal.server.service.ShareCryptoService.Sealed;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ShareCryptoServiceTest {

    private static final String KEY_A = Base64.getEncoder()
            .encodeToString("0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8));
    private static final String KEY_B = Base64.getEncoder()
            .encodeToString("fedcba9876543210fedcba9876543210".getBytes(StandardCharsets.UTF_8));

    private static SecureShareProperties props(String key, String keyId) {
        SecureShareProperties props = new SecureShareProperties();
        props.setMasterKey(key);
        props.setMasterKeyId(keyId);
        return props;
    }

    @Test
    void roundTrip() {
        ShareCryptoService crypto = new ShareCryptoService(props(KEY_A, "k1"));
        UUID id = UUID.randomUUID();
        byte[] plaintext = "top secret".getBytes(StandardCharsets.UTF_8);

        DataKey dataKey = crypto.newDataKey(id);
        Sealed sealed = crypto.encrypt(dataKey.key(), plaintext, id, Purpose.CONTENT);
        byte[] dek = crypto.unwrapDataKey(dataKey.keyId(), dataKey.wrappedKey(), dataKey.iv(), id);

        assertThat(sealed.ciphertext()).isNotEqualTo(plaintext);
        assertThat(crypto.decrypt(dek, sealed, id, Purpose.CONTENT)).isEqualTo(plaintext);
        assertThat(dataKey.keyId()).isEqualTo("k1");
    }

    @Test
    void usesFreshIvPerEncryption() {
        ShareCryptoService crypto = new ShareCryptoService(props(KEY_A, "k1"));
        UUID id = UUID.randomUUID();
        DataKey dataKey = crypto.newDataKey(id);
        byte[] plaintext = "same".getBytes(StandardCharsets.UTF_8);

        Sealed first = crypto.encrypt(dataKey.key(), plaintext, id, Purpose.CONTENT);
        Sealed second = crypto.encrypt(dataKey.key(), plaintext, id, Purpose.CONTENT);

        assertThat(first.iv()).isNotEqualTo(second.iv());
        assertThat(first.ciphertext()).isNotEqualTo(second.ciphertext());
    }

    @Test
    void rejectsSwappedShareId() {
        ShareCryptoService crypto = new ShareCryptoService(props(KEY_A, "k1"));
        UUID id = UUID.randomUUID();
        DataKey dataKey = crypto.newDataKey(id);
        Sealed sealed = crypto.encrypt(dataKey.key(), new byte[] {1, 2, 3}, id, Purpose.CONTENT);

        assertThatThrownBy(() -> crypto.decrypt(dataKey.key(), sealed, UUID.randomUUID(), Purpose.CONTENT))
                .isInstanceOf(ShareCryptoService.ShareCryptoException.class);
        assertThatThrownBy(() -> crypto.unwrapDataKey("k1", dataKey.wrappedKey(), dataKey.iv(), UUID.randomUUID()))
                .isInstanceOf(ShareCryptoService.ShareCryptoException.class);
    }

    @Test
    void rejectsSwappedPurpose() {
        ShareCryptoService crypto = new ShareCryptoService(props(KEY_A, "k1"));
        UUID id = UUID.randomUUID();
        DataKey dataKey = crypto.newDataKey(id);
        Sealed sealed = crypto.encrypt(dataKey.key(), new byte[] {1, 2, 3}, id, Purpose.FILENAME);

        assertThatThrownBy(() -> crypto.decrypt(dataKey.key(), sealed, id, Purpose.CONTENT))
                .isInstanceOf(ShareCryptoService.ShareCryptoException.class);
    }

    @Test
    void decryptsWithPreviousKeyAfterRotation() {
        ShareCryptoService before = new ShareCryptoService(props(KEY_A, "k1"));
        UUID id = UUID.randomUUID();
        DataKey dataKey = before.newDataKey(id);

        SecureShareProperties rotated = props(KEY_B, "k2");
        rotated.setPreviousMasterKey(KEY_A);
        rotated.setPreviousMasterKeyId("k1");
        ShareCryptoService after = new ShareCryptoService(rotated);

        assertThat(after.unwrapDataKey("k1", dataKey.wrappedKey(), dataKey.iv(), id)).isEqualTo(dataKey.key());
        assertThat(after.newDataKey(id).keyId()).isEqualTo("k2");
    }

    @Test
    void rejectsUnknownKeyId() {
        ShareCryptoService crypto = new ShareCryptoService(props(KEY_A, "k1"));
        UUID id = UUID.randomUUID();
        DataKey dataKey = crypto.newDataKey(id);

        assertThatThrownBy(() -> crypto.unwrapDataKey("k9", dataKey.wrappedKey(), dataKey.iv(), id))
                .isInstanceOf(ShareCryptoService.ShareCryptoException.class);
    }

    @Test
    void failsFastOnMissingOrInvalidKeyWithoutLeakingValue() {
        assertThatThrownBy(() -> new ShareCryptoService(props(null, "k1")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("secure-share.master-key");

        String shortKey = Base64.getEncoder().encodeToString("too-short".getBytes(StandardCharsets.UTF_8));
        assertThatThrownBy(() -> new ShareCryptoService(props(shortKey, "k1")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("256-bit")
                .hasMessageNotContaining(shortKey);

        assertThatThrownBy(() -> new ShareCryptoService(props("not base64 !!", "k1")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageNotContaining("not base64");
    }
}
