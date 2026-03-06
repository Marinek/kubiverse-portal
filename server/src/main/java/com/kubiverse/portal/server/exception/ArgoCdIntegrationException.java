package com.kubiverse.portal.server.exception;

/**
 * Exception thrown when the communication with ArgoCD fails.
 * Does not expose the full stack trace to frontend (via
 * GlobalExceptionHandler).
 */
public class ArgoCdIntegrationException extends RuntimeException {

    public ArgoCdIntegrationException(String message) {
        super(message);
    }

    public ArgoCdIntegrationException(String message, Throwable cause) {
        super(message, cause);
    }
}
