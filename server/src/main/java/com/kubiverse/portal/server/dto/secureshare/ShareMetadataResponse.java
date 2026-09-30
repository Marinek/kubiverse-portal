package com.kubiverse.portal.server.dto.secureshare;

import com.kubiverse.portal.server.entity.ShareType;
import java.time.Instant;

public record ShareMetadataResponse(ShareType type, boolean passwordRequired, Instant expiresAt,
        Integer remainingDownloads) {
}
