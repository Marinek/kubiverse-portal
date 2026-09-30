# backend-api Specification

## Purpose

Dokumentiert die öffentliche REST-API des Backends (`server/`) mit Endpunkten, Datenformaten, Statuscodes und Fehlerbehandlung. Basis-Pfad aller Endpunkte ist `/kubiverse/api`. Das Backend lauscht auf Port 8080.

| Methode | Pfad | Controller | Zweck |
|---|---|---|---|
| GET | `/kubiverse/api/argocd/applications` | `ArgoCdController` | Aufbereitete Liste der ArgoCD-Applikationen |
| POST | `/kubiverse/api/bootstrap` | `ProjectBootstrapController` | Neues Projekt (Bitbucket-Repository) initialisieren |

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
