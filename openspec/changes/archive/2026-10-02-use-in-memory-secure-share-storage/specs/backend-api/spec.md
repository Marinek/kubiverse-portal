# Spec Delta

## MODIFIED Requirements

### Requirement: Gemeinsame Regeln der Secure-Share-Endpunkte
Alle Endpunkte unter `/kubiverse/api/shares` SHALL den Header `X-Kubiverse-Client: portal` verlangen, Antworten mit `Cache-Control: no-store` kennzeichnen, Fehler im Format `ErrorResponse` liefern und das Zugriffsgeheimnis ausschließlich im Request-Body erwarten.

#### Scenario: Fehlender Client-Header
- **WHEN** eine Anfrage ohne `X-Kubiverse-Client: portal` eintrifft
- **THEN** antwortet das Backend mit HTTP 400 und verarbeitet die Anfrage nicht

#### Scenario: Anfragebegrenzung
- **WHEN** das Limit für die Client-IP überschritten ist
- **THEN** antwortet das Backend mit HTTP 429 und einem `Retry-After`-Header in Sekunden

#### Scenario: Kapazität erschöpft oder Feature nicht verfügbar
- **WHEN** die globale Kapazität erreicht ist
- **THEN** antwortet das Backend mit HTTP 503 im Format `ErrorResponse`

#### Scenario: Keine Zwischenspeicherung
- **WHEN** ein Secure-Share-Endpunkt antwortet
- **THEN** enthält die Antwort `Cache-Control: no-store`