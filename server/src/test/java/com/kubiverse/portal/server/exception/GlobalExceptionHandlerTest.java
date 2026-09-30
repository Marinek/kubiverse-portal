package com.kubiverse.portal.server.exception;

import static org.assertj.core.api.Assertions.assertThat;

import com.kubiverse.portal.server.dto.ErrorResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsShareExceptions() {
        assertStatus(handler.handleShareValidation(new ShareValidationException(List.of("a: x", "b: y"))), 400,
                "Validation failed", "a: x, b: y");
        assertStatus(handler.handleSharePassword(new SharePasswordException()), 403, "Access denied", null);
        assertStatus(handler.handleShareNotAvailable(new ShareNotAvailableException()), 404,
                "Share not available", null);
        assertStatus(handler.handlePayloadTooLarge(new ShareTooLargeException()), 413, "Payload too large", null);
        assertStatus(handler.handlePayloadTooLarge(new MaxUploadSizeExceededException(10_485_760)), 413,
                "Payload too large", null);
        assertStatus(handler.handleShareServiceUnavailable(
                new ShareServiceUnavailableException(ShareServiceUnavailableException.CAPACITY)), 503,
                "Service unavailable", ShareServiceUnavailableException.CAPACITY);
    }

    @Test
    void rateLimitSetsRetryAfter() {
        ResponseEntity<ErrorResponse> response = handler.handleRateLimit(new RateLimitExceededException(42));

        assertThat(response.getStatusCode().value()).isEqualTo(429);
        assertThat(response.getHeaders().getFirst("Retry-After")).isEqualTo("42");
    }

    private static void assertStatus(ResponseEntity<ErrorResponse> response, int status, String message,
            String details) {
        assertThat(response.getStatusCode().value()).isEqualTo(status);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo(message);
        if (details != null) {
            assertThat(response.getBody().getDetails()).isEqualTo(details);
        }
    }
}
