package com.kubiverse.portal.server.dto.secureshare;

public record RetrieveShareRequest(String token, String password) {

    @Override
    public String toString() {
        return "RetrieveShareRequest[token=***, password=***]";
    }
}
