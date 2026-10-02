package com.kubiverse.portal.server.service;

import com.kubiverse.portal.server.config.SecureShareProperties;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

/**
 * Envelope encryption for secure shares: a random data key (DEK) per share encrypts the
 * content with AES-256-GCM; the DEK itself is wrapped with the configured master key (KEK).
 */
@Service
public class ShareCryptoService {

    private static final String AES = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int KEY_BYTES = 32;
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecureRandom random = new SecureRandom();
    private final Map<String, SecretKey> masterKeys = new HashMap<>();
    private final String currentKeyId;

    public ShareCryptoService(SecureShareProperties properties) {
        this.currentKeyId = requireText(properties.getMasterKeyId(), "secure-share.master-key-id");
        masterKeys.put(currentKeyId, decodeKey(properties.getMasterKey(), "secure-share.master-key"));

        if (hasText(properties.getPreviousMasterKey())) {
            String previousId = requireText(properties.getPreviousMasterKeyId(),
                    "secure-share.previous-master-key-id");
            if (previousId.equals(currentKeyId)) {
                throw new IllegalStateException(
                        "secure-share.previous-master-key-id must differ from secure-share.master-key-id");
            }
            masterKeys.put(previousId, decodeKey(properties.getPreviousMasterKey(),
                    "secure-share.previous-master-key"));
        }
    }

    public record DataKey(String keyId, byte[] key, byte[] wrappedKey, byte[] iv) {
    }

    public record Sealed(byte[] ciphertext, byte[] iv) {
    }

    public enum Purpose {
        DEK, CONTENT, FILENAME
    }

    public DataKey newDataKey(UUID shareId) {
        byte[] dek = randomBytes(KEY_BYTES);
        Sealed wrapped = seal(masterKeys.get(currentKeyId), dek, shareId, Purpose.DEK);
        return new DataKey(currentKeyId, dek, wrapped.ciphertext(), wrapped.iv());
    }

    public byte[] unwrapDataKey(String keyId, byte[] wrappedKey, byte[] iv, UUID shareId) {
        SecretKey kek = masterKeys.get(keyId);
        if (kek == null) {
            throw new ShareCryptoException("Unknown master key id");
        }
        return open(kek, new Sealed(wrappedKey, iv), shareId, Purpose.DEK);
    }

    public Sealed encrypt(byte[] dek, byte[] plaintext, UUID shareId, Purpose purpose) {
        return seal(new SecretKeySpec(dek, AES), plaintext, shareId, purpose);
    }

    public byte[] decrypt(byte[] dek, Sealed sealed, UUID shareId, Purpose purpose) {
        return open(new SecretKeySpec(dek, AES), sealed, shareId, purpose);
    }

    private Sealed seal(SecretKey key, byte[] plaintext, UUID shareId, Purpose purpose) {
        byte[] iv = randomBytes(IV_BYTES);
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            cipher.updateAAD(aad(shareId, purpose));
            return new Sealed(cipher.doFinal(plaintext), iv);
        } catch (GeneralSecurityException e) {
            throw new ShareCryptoException("Encryption failed", e);
        }
    }

    private byte[] open(SecretKey key, Sealed sealed, UUID shareId, Purpose purpose) {
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, sealed.iv()));
            cipher.updateAAD(aad(shareId, purpose));
            return cipher.doFinal(sealed.ciphertext());
        } catch (GeneralSecurityException e) {
            throw new ShareCryptoException("Decryption failed", e);
        }
    }

    private static byte[] aad(UUID shareId, Purpose purpose) {
        return (shareId + ":" + purpose.name()).getBytes(StandardCharsets.UTF_8);
    }

    private byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        random.nextBytes(bytes);
        return bytes;
    }

    private static SecretKey decodeKey(String base64, String property) {
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(requireText(base64, property).trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(property + " must be Base64-encoded");
        }
        if (raw.length != KEY_BYTES) {
            throw new IllegalStateException(property + " must be a 256-bit (32 byte) key");
        }
        return new SecretKeySpec(raw, AES);
    }

    private static String requireText(String value, String property) {
        if (!hasText(value)) {
            throw new IllegalStateException(property + " must be configured");
        }
        return value;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public static class ShareCryptoException extends RuntimeException {
        public ShareCryptoException(String message) {
            super(message);
        }

        public ShareCryptoException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
