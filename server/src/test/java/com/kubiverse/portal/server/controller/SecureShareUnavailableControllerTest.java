package com.kubiverse.portal.server.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.handler;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "argocd.url=http://127.0.0.1:1")
@AutoConfigureMockMvc
@ActiveProfiles("no-db")
class SecureShareUnavailableControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void secureShareRespondsWith503WithoutDatabase() throws Exception {
        mockMvc.perform(multipart("/kubiverse/api/shares").param("text", "secret")
                        .header("X-Kubiverse-Client", "portal"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.details").value("Secure Share is not available"));
        mockMvc.perform(post("/kubiverse/api/shares/lookup").header("X-Kubiverse-Client", "portal")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"x\"}"))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void otherEndpointsRemainMapped() throws Exception {
        mockMvc.perform(get("/kubiverse/api/argocd/applications"))
                .andExpect(handler().handlerType(ArgoCdController.class));
    }
}
