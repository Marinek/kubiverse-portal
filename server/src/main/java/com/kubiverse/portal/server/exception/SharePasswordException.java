package com.kubiverse.portal.server.exception;

public class SharePasswordException extends RuntimeException {

    public SharePasswordException() {
        super("Password required or incorrect");
    }
}
