package com.kubiverse.portal.server.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.handler;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "argocd.url=http://127.0.0.1:1",
        "secure-share.master-key=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
        "secure-share.master-key-id=test-k1"
})
@AutoConfigureMockMvc
class SecureShareInMemoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void secureShareWorksWithoutDatabase() throws Exception {
        MvcResult created = mockMvc.perform(multipart("/kubiverse/api/shares")
                        .param("text", "secret")
                        .header("X-Kubiverse-Client", "portal"))
                .andExpect(status().isCreated())
                .andReturn();
        String token = objectMapper.readTree(created.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(post("/kubiverse/api/shares/lookup")
                        .header("X-Kubiverse-Client", "portal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("TEXT"));

        mockMvc.perform(post("/kubiverse/api/shares/retrieve")
                        .header("X-Kubiverse-Client", "portal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("secret"));
    }

    @Test
    void otherEndpointsRemainMapped() throws Exception {
        mockMvc.perform(get("/kubiverse/api/argocd/applications"))
                .andExpect(handler().handlerType(ArgoCdController.class));
    }
}