package com.kubiverse.portal.server.exception;

import java.util.List;
import lombok.Getter;

@Getter
public class ShareValidationException extends RuntimeException {

    private final List<String> fieldErrors;

    public ShareValidationException(List<String> fieldErrors) {
        super("Share validation failed");
        this.fieldErrors = List.copyOf(fieldErrors);
    }
}
