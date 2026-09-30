package com.kubiverse.portal.server;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class ServerApplicationDbProfileTests {

    @Test
    void contextLoadsWithDatabase() {
        // Verifies that the context starts with JPA and the secure share beans enabled
    }
}
