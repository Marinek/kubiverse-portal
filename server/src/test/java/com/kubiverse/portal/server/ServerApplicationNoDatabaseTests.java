package com.kubiverse.portal.server;

import static org.assertj.core.api.Assertions.assertThat;

import com.kubiverse.portal.server.service.SecureShareService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

@SpringBootTest(properties = {
        "secure-share.master-key=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
        "secure-share.master-key-id=test-k1"
})
class ServerApplicationNoDatabaseTests {

    @Autowired
    private ApplicationContext context;

    @Test
    void contextLoadsWithSecureShareAndWithoutDatasource() {
        assertThat(context.getBean(SecureShareService.class)).isNotNull();
        assertThat(context.containsBean("dataSource")).isFalse();
    }
}