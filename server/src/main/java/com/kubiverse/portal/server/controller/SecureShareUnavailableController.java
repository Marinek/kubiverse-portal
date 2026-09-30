package com.kubiverse.portal.server.controller;

import com.kubiverse.portal.server.exception.ShareServiceUnavailableException;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Stands in for {@link SecureShareController} when the backend runs without a database.
 */
@RestController
@RequestMapping("/kubiverse/api/shares")
@Profile("no-db")
public class SecureShareUnavailableController {

    @RequestMapping(path = {"", "/**"})
    public void unavailable() {
        throw new ShareServiceUnavailableException(ShareServiceUnavailableException.NOT_AVAILABLE);
    }
}
