package com.kubiverse.portal.server.exception;

public class ShareServiceUnavailableException extends RuntimeException {

    public static final String CAPACITY = "Secure Share capacity exhausted";
    public static final String NOT_AVAILABLE = "Secure Share is not available";

    public ShareServiceUnavailableException(String message) {
        super(message);
    }
}
