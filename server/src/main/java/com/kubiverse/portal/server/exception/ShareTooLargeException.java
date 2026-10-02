package com.kubiverse.portal.server.exception;

public class ShareTooLargeException extends RuntimeException {

    public ShareTooLargeException() {
        super("File exceeds the maximum size of 10 MB");
    }
}
