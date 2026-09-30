package com.kubiverse.portal.server.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kubiverse.portal.server.TestClock;
import com.kubiverse.portal.server.repository.SecureShareRepository;
import com.kubiverse.portal.server.service.SecureShareService;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestClock.Config.class)
class SecureShareControllerTest {

    private static final AtomicInteger IP_COUNTER = new AtomicInteger();

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private SecureShareRepository repository;
    @Autowired
    private TestClock clock;

    private String ip;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        clock.reset();
        int n = IP_COUNTER.incrementAndGet();
        ip = "10.40." + (n / 250) + "." + (n % 250 + 1);
    }

    private <T extends MockHttpServletRequestBuilder> T client(T builder) {
        builder.header("X-Kubiverse-Client", "portal").with(request -> {
            request.setRemoteAddr(ip);
            return request;
        });
        return builder;
    }

    private MockMultipartHttpServletRequestBuilder createRequest() {
        return client(multipart("/kubiverse/api/shares"));
    }

    private MockHttpServletRequestBuilder json(String path, String body) {
        return client(post(path)).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private String createText(String text, String... params) throws Exception {
        MockMultipartHttpServletRequestBuilder request = createRequest();
        request.param("text", text);
        for (int i = 0; i < params.length; i += 2) {
            request.param(params[i], params[i + 1]);
        }
        MvcResult result = mockMvc.perform(request).andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private String tokenJson(String token) {
        return "{\"token\":\"" + token + "\"}";
    }

    @Test
    void createsTextShare() throws Exception {
        mockMvc.perform(createRequest().param("text", "secret").param("expiresIn", "1h"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.expiresAt").value("2026-09-30T13:00:00Z"))
                .andExpect(jsonPath("$.maxDownloads").value(1));
    }

    @Test
    void createsUnlimitedShareWithNullMaxDownloads() throws Exception {
        mockMvc.perform(createRequest().param("text", "secret").param("maxDownloads", "unlimited"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.maxDownloads").doesNotExist());
    }

    @Test
    void rejectsRequestWithoutClientHeader() throws Exception {
        mockMvc.perform(multipart("/kubiverse/api/shares").param("text", "secret"))
                .andExpect(status().isBadRequest());
        assertThat(repository.count()).isZero();
    }

    @Test
    void reportsValidationErrorsWithFieldNames() throws Exception {
        mockMvc.perform(createRequest().param("text", "secret").param("expiresIn", "30d").param("maxDownloads", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.details").value(org.hamcrest.Matchers.containsString("expiresIn")))
                .andExpect(jsonPath("$.details").value(org.hamcrest.Matchers.containsString("maxDownloads")));
    }

    @Test
    void rejectsFileLargerThan10Mb() throws Exception {
        MockMultipartFile big = new MockMultipartFile("file", "big.bin", "application/octet-stream",
                new byte[(int) SecureShareService.MAX_FILE_BYTES + 1]);

        mockMvc.perform(createRequest().file(big))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.message").value("Payload too large"));
    }

    @Test
    void textRoundTrip() throws Exception {
        String token = createText("my secret", "maxDownloads", "2");

        mockMvc.perform(json("/kubiverse/api/shares/lookup", tokenJson(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("TEXT"))
                .andExpect(jsonPath("$.passwordRequired").value(false))
                .andExpect(jsonPath("$.remainingDownloads").value(2));

        mockMvc.perform(json("/kubiverse/api/shares/retrieve", tokenJson(token)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.text").value("my secret"));
    }

    @Test
    void fileRoundTripWithSafeContentDisposition() throws Exception {
        byte[] data = "file-bytes".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "../Prüfbericht \"final\"*.pdf",
                "application/pdf", data);
        MvcResult created = mockMvc.perform(createRequest().file(file)).andExpect(status().isCreated()).andReturn();
        String token = objectMapper.readTree(created.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(json("/kubiverse/api/shares/retrieve", tokenJson(token)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"Pr_fbericht final*.pdf\"; "
                                + "filename*=UTF-8''Pr%C3%BCfbericht%20final%2A.pdf"))
                .andExpect(content().bytes(data));
    }

    @Test
    void notAvailableResponseIsIdenticalForLookupAndRetrieve() throws Exception {
        String token = createText("once");
        mockMvc.perform(json("/kubiverse/api/shares/retrieve", tokenJson(token))).andExpect(status().isOk());

        String consumedLookup = mockMvc.perform(json("/kubiverse/api/shares/lookup", tokenJson(token)))
                .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        String consumedRetrieve = mockMvc.perform(json("/kubiverse/api/shares/retrieve", tokenJson(token)))
                .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        String unknown = mockMvc.perform(json("/kubiverse/api/shares/lookup", tokenJson("does-not-exist")))
                .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();

        assertThat(consumedLookup).isEqualTo(consumedRetrieve).isEqualTo(unknown);
        JsonNode body = objectMapper.readTree(unknown);
        assertThat(body.get("message").asText()).isEqualTo("Share not available");
    }

    @Test
    void wrongPasswordReturns403() throws Exception {
        String token = createText("secret", "password", "password1");

        mockMvc.perform(json("/kubiverse/api/shares/retrieve",
                        "{\"token\":\"" + token + "\",\"password\":\"nope-nope\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied"));
        mockMvc.perform(json("/kubiverse/api/shares/retrieve",
                        "{\"token\":\"" + token + "\",\"password\":\"password1\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void rateLimitReturns429WithRetryAfter() throws Exception {
        for (int i = 0; i < 20; i++) {
            createText("secret");
        }
        mockMvc.perform(createRequest().param("text", "secret"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "3600"));
    }

    @Test
    void malformedJsonReturns400() throws Exception {
        mockMvc.perform(json("/kubiverse/api/shares/lookup", "{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed request"));
    }
}
