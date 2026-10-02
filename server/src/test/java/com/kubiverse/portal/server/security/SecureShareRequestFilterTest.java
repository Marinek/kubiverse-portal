package com.kubiverse.portal.server.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SecureShareRequestFilterTest {

    private final SecureShareRequestFilter filter = new SecureShareRequestFilter(new ObjectMapper());

    private MockHttpServletResponse run(String uri, String clientHeader, MockFilterChain chain) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", uri);
        if (clientHeader != null) {
            request.addHeader(SecureShareRequestFilter.CLIENT_HEADER, clientHeader);
        }
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        return response;
    }

    @Test
    void rejectsMissingClientHeader() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = run("/kubiverse/api/shares", null, chain);

        assertThat(response.getStatus()).isEqualTo(400);
        assertThat(response.getContentAsString()).contains("X-Kubiverse-Client");
        assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store");
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    void rejectsWrongClientHeader() throws Exception {
        MockFilterChain chain = new MockFilterChain();

        assertThat(run("/kubiverse/api/shares/lookup", "evil", chain).getStatus()).isEqualTo(400);
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    void passesWithClientHeaderAndMarksNoStore() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = run("/kubiverse/api/shares/retrieve", "portal", chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store");
        assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
    }

    @Test
    void ignoresOtherPaths() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = run("/kubiverse/api/argocd/applications", null, chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(response.getHeader("Cache-Control")).isNull();

        MockFilterChain other = new MockFilterChain();
        run("/kubiverse/api/sharesX", null, other);
        assertThat(other.getRequest()).isNotNull();
    }
}
