package com.kubiverse.portal.server.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kubiverse.portal.server.TestClock;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Exercises the full secure share flow, including error paths, and verifies that no confidential
 * value appears in any log output.
 */
@SpringBootTest(properties = {
        "secure-share.master-key=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
        "secure-share.master-key-id=test-k1"
})
@AutoConfigureMockMvc
@Import(TestClock.Config.class)
@ExtendWith(OutputCaptureExtension.class)
class SecureShareLogHygieneTest {

    private static final String SECRET_TEXT = "LEAK-CANARY-TEXT-7f3a";
    private static final String FILE_CONTENT = "LEAK-CANARY-FILE-91bc";
    private static final String FILENAME = "leak-canary-name-4d2e.txt";
    private static final String PASSWORD = "leak-canary-pass-88aa";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    private <T extends MockHttpServletRequestBuilder> T client(T builder) {
        builder.header("X-Kubiverse-Client", "portal").with(request -> {
            request.setRemoteAddr("10.50.0.1");
            return request;
        });
        return builder;
    }

    private String create(MockHttpServletRequestBuilder request) throws Exception {
        String body = mockMvc.perform(request).andExpect(status().isCreated()).andReturn()
                .getResponse().getContentAsString();
        return objectMapper.readTree(body).get("token").asText();
    }

    private void retrieve(String token, String password, int expectedStatus) throws Exception {
        String body = objectMapper.writeValueAsString(
                password == null ? java.util.Map.of("token", token) : java.util.Map.of("token", token, "password", password));
        mockMvc.perform(client(post("/kubiverse/api/shares/retrieve"))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(expectedStatus));
    }

    @Test
    void noConfidentialValuesInLogs(CapturedOutput output) throws Exception {
        String textToken = create(client(multipart("/kubiverse/api/shares"))
                .param("text", SECRET_TEXT).param("password", PASSWORD).param("maxDownloads", "2"));
        String fileToken = create(client(multipart("/kubiverse/api/shares")
                .file(new MockMultipartFile("file", FILENAME, "text/plain",
                        FILE_CONTENT.getBytes(StandardCharsets.UTF_8)))));

        mockMvc.perform(client(post("/kubiverse/api/shares/lookup"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + textToken + "\"}"))
                .andExpect(status().isOk());
        retrieve(textToken, "wrong-" + PASSWORD, 403);
        retrieve(textToken, PASSWORD, 200);
        retrieve(fileToken, null, 200);
        retrieve(fileToken, null, 404);
        mockMvc.perform(client(post("/kubiverse/api/shares/lookup"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + SECRET_TEXT))
                .andExpect(status().isBadRequest());
        mockMvc.perform(client(multipart("/kubiverse/api/shares"))
                        .param("text", SECRET_TEXT).param("password", "x"))
                .andExpect(status().isBadRequest());

        assertThat(output).contains("event=SHARE_CREATED", "event=SHARE_RETRIEVED", "event=SHARE_PASSWORD_FAILED",
                "event=SHARE_DELETED", "event=SHARE_NOT_AVAILABLE");
        assertThat(output).doesNotContain(SECRET_TEXT, FILE_CONTENT, FILENAME, PASSWORD, textToken, fileToken);
    }
}
