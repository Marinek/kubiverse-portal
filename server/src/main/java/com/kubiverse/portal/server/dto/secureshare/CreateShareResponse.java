package com.kubiverse.portal.server.dto.secureshare;

import java.time.Instant;

public record CreateShareResponse(String token, Instant expiresAt, Integer maxDownloads) {

    @Override
    public String toString() {
        return "CreateShareResponse[expiresAt=" + expiresAt + ", maxDownloads=" + maxDownloads + "]";
    }
}
