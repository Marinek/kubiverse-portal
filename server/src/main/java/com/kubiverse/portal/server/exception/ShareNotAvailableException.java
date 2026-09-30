package com.kubiverse.portal.server.exception;

/**
 * Uniform signal for unknown, expired, consumed or deleted shares; the cause is deliberately not exposed.
 */
public class ShareNotAvailableException extends RuntimeException {

    public ShareNotAvailableException() {
        super("Share not available");
    }
}
