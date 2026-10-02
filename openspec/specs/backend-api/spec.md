# backend-api Specification

## Purpose

Dokumentiert die öffentliche REST-API des Backends (`server/`) mit Endpunkten, Datenformaten, Statuscodes und Fehlerbehandlung. Basis-Pfad aller Endpunkte ist `/kubiverse/api`. Das Backend lauscht auf Port 8080.

| Methode | Pfad | Controller | Zweck |
|---|---|---|---|
| GET | `/kubiverse/api/argocd/applications` | `ArgoCdController` | Aufbereitete Liste der ArgoCD-Applikationen |
| POST | `/kubiverse/api/bootstrap` | `ProjectBootstrapController` | Neues Projekt (Bitbucket-Repository) initialisieren |
| POST | `/kubiverse/api/shares` | `SecureShareController` | Secure Share erstellen (multipart) |
| POST | `/kubiverse/api/shares/lookup` | `SecureShareController` | Metadaten eines Shares abfragen |
| POST | `/kubiverse/api/shares/retrieve` | `SecureShareController` | Inhalt eines Shares abrufen |

## Requirements

### Requirement: Endpunkt ArgoCD-Applikationen
Das Backend SHALL unter `GET /kubiverse/api/argocd/applications` ein JSON-Array von Applikationsobjekten liefern. Jedes Objekt MUST die Felder `name` (string), `project` (string), `syncStatus` (string), `healthStatus` (string), `argocdUrl` (string) und `externalUrls` (string-Array) enthalten.

#### Scenario: Erfolgreicher Abruf
- **WHEN** ein Client `GET /kubiverse/api/argocd/applications` aufruft und ArgoCD erreichbar ist
- **THEN** antwortet das Backend mit HTTP 200 und einem JSON-Array, z. B.
  `[{"name":"kubiverse-frontend","project":"kubiverse","syncStatus":"Synced","healthStatus":"Healthy","argocdUrl":"http://mock:12004/applications/kubiverse-frontend","externalUrls":["https://frontend.kubiverse.internal"]}]`

#### Scenario: ArgoCD nicht erreichbar oder Fehlerstatus
- **WHEN** der Aufruf der ArgoCD-API fehlschlägt
- **THEN** wirft `ArgoCdService` eine `ArgoCdIntegrationException`
- **AND** der `GlobalExceptionHandler` antwortet mit HTTP 500 und `{"message":"Internal server error","details":"An unexpected error occurred"}`

### Requirement: Endpunkt Projekt-Bootstrap
Das Backend SHALL unter `POST /kubiverse/api/bootstrap` einen JSON-Body `{"projectName": "<string>"}` (DTO `BootstrapRequest`) entgegennehmen und den Bootstrap-Prozess anstoßen. Der Projektname MUST vor der Verarbeitung getrimmt werden.

#### Scenario: Erfolgreicher Bootstrap
- **WHEN** ein Client einen nicht-leeren `projectName` sendet und der Prozess ohne Ausnahme durchläuft
- **THEN** antwortet das Backend mit HTTP 200 und `{"message":"Project bootstrapped successfully"}`

#### Scenario: Fehlender oder leerer Projektname
- **WHEN** `projectName` fehlt, `null` ist oder nur Leerzeichen enthält
- **THEN** antwortet das Backend mit HTTP 400 und `{"error":"Project name is required"}`

#### Scenario: Fehler im Bootstrap-Prozess
- **WHEN** der `ProjectBootstrapService` eine Ausnahme wirft
- **THEN** antwortet das Backend mit HTTP 500 und `{"error":"<Exception-Message>"}` (z. B. `Bitbucket API call failed` oder `Git bootstrap failed`)

### Requirement: Globale Fehlerbehandlung
Das Backend SHALL nicht behandelte Ausnahmen über `GlobalExceptionHandler` (`@ControllerAdvice`) in ein einheitliches `ErrorResponse`-Format `{"message": string, "details": string}` überführen, ohne Stacktraces an den Client zu geben.

#### Scenario: Validierungsfehler
- **WHEN** eine `MethodArgumentNotValidException` auftritt
- **THEN** antwortet das Backend mit HTTP 400, `message` = `Validation failed` und `details` = kommaseparierte Liste `feld: meldung`

#### Scenario: Zugriff verweigert
- **WHEN** eine `AccessDeniedException` auftritt
- **THEN** antwortet das Backend mit HTTP 403, `message` = `Access denied` und `details` = `You do not have permission to access this resource`

#### Scenario: Unerwarteter Fehler
- **WHEN** eine sonstige `Exception` bis zum Handler durchgereicht wird
- **THEN** antwortet das Backend mit HTTP 500, `message` = `Internal server error` und `details` = `An unexpected error occurred`
- **AND** die Ausnahme wird serverseitig mit Stacktrace geloggt

### Requirement: Uneinheitliche Fehlerformate
Das Backend SHALL derzeit zwei Fehlerformate verwenden: `ErrorResponse` (`message`/`details`) aus dem `GlobalExceptionHandler` und ein Map-Format `{"error": ...}` aus dem `ProjectBootstrapController`. Clients MUST beide Formate berücksichtigen.

#### Scenario: Frontend wertet Bootstrap-Fehler aus
- **WHEN** der Bootstrap-Endpunkt einen Fehlerstatus liefert
- **THEN** liest das Frontend das Feld `error` aus der Antwort und fällt auf `Bootstrap fehlgeschlagen` zurück, falls es fehlt

### Requirement: Endpunkt Share erstellen
Das Backend SHALL unter `POST /kubiverse/api/shares` eine `multipart/form-data`-Anfrage mit den Feldern `text` oder `file` (genau eines), `expiresIn` (`1h`, `24h`, `3d`, `7d`; Standard `24h`), `maxDownloads` (`1`–`100` oder `unlimited`; Standard `1`) und optional `password` entgegennehmen. Bei Erfolg MUST es mit HTTP 201 und `{"token": string, "expiresAt": ISO-8601, "maxDownloads": number|null}` antworten (`null` = unbegrenzt).

#### Scenario: Erfolgreiche Erstellung
- **WHEN** eine gültige Anfrage mit dem Header `X-Kubiverse-Client: portal` gesendet wird
- **THEN** antwortet das Backend mit HTTP 201 und den Feldern `token`, `expiresAt` und `maxDownloads`

#### Scenario: Ungültige Eingaben
- **WHEN** Pflichtfelder fehlen, beide Inhalte gesetzt sind oder `expiresIn`, `maxDownloads`, `password` oder die Textlänge ungültig sind
- **THEN** antwortet das Backend mit HTTP 400 im Format `ErrorResponse`, wobei `details` die betroffenen Felder nennt

#### Scenario: Datei zu groß
- **WHEN** die Datei größer als 10 MB ist
- **THEN** antwortet das Backend mit HTTP 413 im Format `ErrorResponse`

### Requirement: Endpunkt Share-Metadaten
Das Backend SHALL unter `POST /kubiverse/api/shares/lookup` einen JSON-Body `{"token": string}` entgegennehmen und `{"type": "TEXT"|"FILE", "passwordRequired": boolean, "expiresAt": ISO-8601, "remainingDownloads": number|null}` liefern, ohne den Abrufzähler zu verändern.

#### Scenario: Verfügbarer Share
- **WHEN** das Token zu einem verfügbaren Share gehört
- **THEN** antwortet das Backend mit HTTP 200 und den Metadaten

#### Scenario: Nicht verfügbarer Share
- **WHEN** das Token unbekannt ist oder der Share abgelaufen, verbraucht oder gelöscht ist
- **THEN** antwortet das Backend mit HTTP 404 und identischem Antwortinhalt für alle diese Fälle

### Requirement: Endpunkt Share abrufen
Das Backend SHALL unter `POST /kubiverse/api/shares/retrieve` einen JSON-Body `{"token": string, "password": string?}` entgegennehmen und bei Erfolg den Inhalt ausliefern und den Abruf zählen. Text-Secrets MUST als `{"text": string}` (`application/json`) und Dateien als `application/octet-stream` mit `Content-Disposition: attachment` und dem ursprünglichen, bereinigten Dateinamen ausgeliefert werden.

#### Scenario: Text abrufen
- **WHEN** ein gültiges Token zu einem Text-Share (und ggf. das korrekte Passwort) gesendet wird
- **THEN** antwortet das Backend mit HTTP 200 und `{"text": ...}`

#### Scenario: Datei abrufen
- **WHEN** ein gültiges Token zu einem Datei-Share (und ggf. das korrekte Passwort) gesendet wird
- **THEN** antwortet das Backend mit HTTP 200, `Content-Type: application/octet-stream`, `Content-Disposition: attachment; filename=...` und dem Dateiinhalt

#### Scenario: Passwort fehlt oder ist falsch
- **WHEN** der Share passwortgeschützt ist und kein oder ein falsches Passwort gesendet wird
- **THEN** antwortet das Backend mit HTTP 403 im Format `ErrorResponse` und zählt keinen Abruf

#### Scenario: Nicht verfügbarer Share
- **WHEN** das Token unbekannt ist oder der Share abgelaufen, verbraucht oder gelöscht ist
- **THEN** antwortet das Backend mit HTTP 404 und demselben Antwortinhalt wie der Metadaten-Endpunkt

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
