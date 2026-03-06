package com.kubiverse.portal.server.dto.argocd;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ArgoCdApplicationListDto {
    private List<ArgoCdApplicationDto> items = new ArrayList<>();
}
