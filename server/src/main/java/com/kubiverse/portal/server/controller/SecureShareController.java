package com.kubiverse.portal.server.controller;

import com.kubiverse.portal.server.dto.secureshare.CreateShareResponse;
import com.kubiverse.portal.server.dto.secureshare.RetrieveShareRequest;
import com.kubiverse.portal.server.dto.secureshare.ShareMetadataResponse;
import com.kubiverse.portal.server.dto.secureshare.ShareTokenRequest;
import com.kubiverse.portal.server.dto.secureshare.TextShareResponse;
import com.kubiverse.portal.server.entity.ShareType;
import com.kubiverse.portal.server.exception.ShareTooLargeException;
import com.kubiverse.portal.server.service.SecureShareService;
import com.kubiverse.portal.server.service.SecureShareService.CreateCommand;
import com.kubiverse.portal.server.service.SecureShareService.CreatedShare;
import com.kubiverse.portal.server.service.SecureShareService.RetrievedShare;
import com.kubiverse.portal.server.service.SecureShareService.ShareMetadata;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/kubiverse/api/shares")
@RequiredArgsConstructor
public class SecureShareController {

    private final SecureShareService secureShareService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CreateShareResponse> create(
            @RequestParam(required = false) String text,
            @RequestParam(required = false) MultipartFile file,
            @RequestParam(required = false) String expiresIn,
            @RequestParam(required = false) String maxDownloads,
            @RequestParam(required = false) String password,
            HttpServletRequest request) throws IOException {
        byte[] content = null;
        String filename = null;
        if (file != null) {
            if (file.getSize() > SecureShareService.MAX_FILE_BYTES) {
                throw new ShareTooLargeException();
            }
            content = file.getBytes();
            filename = file.getOriginalFilename();
        }

        CreatedShare created = secureShareService.create(
                new CreateCommand(text, content, filename, expiresIn, maxDownloads, password),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CreateShareResponse(created.token(), created.expiresAt(), created.maxDownloads()));
    }

    @PostMapping(path = "/lookup", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ShareMetadataResponse lookup(@RequestBody ShareTokenRequest body, HttpServletRequest request) {
        ShareMetadata metadata = secureShareService.lookup(body.token(), request.getRemoteAddr());
        return new ShareMetadataResponse(metadata.type(), metadata.passwordRequired(), metadata.expiresAt(),
                metadata.remainingDownloads());
    }

    @PostMapping(path = "/retrieve", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> retrieve(@RequestBody RetrieveShareRequest body, HttpServletRequest request) {
        RetrievedShare share = secureShareService.retrieve(body.token(), body.password(), request.getRemoteAddr());

        if (share.type() == ShareType.TEXT) {
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new TextShareResponse(new String(share.content(), StandardCharsets.UTF_8)));
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(share.filename()))
                .contentLength(share.content().length)
                .body(share.content());
    }

    static String contentDisposition(String filename) {
        String asciiFallback = filename.replaceAll("[^\\x20-\\x7E]", "_").replace('"', '_').replace('\\', '_');
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8)
                .replace("+", "%20")
                .replace("*", "%2A");
        return "attachment; filename=\"" + asciiFallback + "\"; filename*=UTF-8''" + encoded;
    }
}
