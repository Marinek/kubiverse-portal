package com.kubiverse.portal.server.dto.secureshare;

public record ShareTokenRequest(String token) {

    @Override
    public String toString() {
        return "ShareTokenRequest[token=***]";
    }
}
