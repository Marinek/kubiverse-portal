package com.kubiverse.portal.server.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kubiverse.portal.server.dto.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Guards the secure share endpoints: requires the portal client header (forces a CORS preflight
 * for cross-origin requests, which is not granted) and marks all responses as non-cacheable.
 */
@Component
@RequiredArgsConstructor
public class SecureShareRequestFilter extends OncePerRequestFilter {

    public static final String PATH_PREFIX = "/kubiverse/api/shares";
    public static final String CLIENT_HEADER = "X-Kubiverse-Client";
    public static final String CLIENT_VALUE = "portal";

    private final ObjectMapper objectMapper;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return !(path.equals(PATH_PREFIX) || path.startsWith(PATH_PREFIX + "/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setHeader(HttpHeaders.PRAGMA, "no-cache");
        response.setHeader("X-Content-Type-Options", "nosniff");

        if (!CLIENT_VALUE.equals(request.getHeader(CLIENT_HEADER))) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getOutputStream(),
                    new ErrorResponse("Bad request", "Missing or invalid " + CLIENT_HEADER + " header"));
            return;
        }
        chain.doFilter(request, response);
    }
}
