# security Specification

## Purpose

Beschreibt das im Code umgesetzte Sicherheitskonzept von Backend, Portal (nginx/SPA) und Mock sowie die daraus erkennbaren offenen Punkte.

**Umgesetzte Bausteine:**

- Spring Security mit zustandsloser Session-Verwaltung und JWT-Filter (`SecurityConfig`, `JwtAuthenticationFilter`, `JwtTokenUtil`, `CustomUserDetailsService`)
- Bearer-Token-Authentifizierung gegenüber ArgoCD und Bitbucket, Token-Authentifizierung für Git (JGit)
- Fehlerbehandlung ohne Stacktraces nach außen (`GlobalExceptionHandler`)
- nginx-Härtung (`server_tokens off`, Sicherheitsheader)
- Externe Links im Frontend mit `rel="noopener noreferrer"`

**Aus dem Code erkennbare offene Punkte (Ist-Zustand, keine Soll-Vorgabe):**

- Es sind keine URL- oder Methoden-Autorisierungsregeln konfiguriert (`authorizeHttpRequests` fehlt, keine `@PreAuthorize`-Annotationen); alle Endpunkte sind ohne Authentifizierung aufrufbar.
- Es existiert kein Endpunkt, der JWTs ausstellt (`JwtTokenUtil.generateToken` wird nicht aufgerufen); das Frontend sendet keine Tokens.
- `jwt.secret` und Datenbank-Zugangsdaten stehen im Klartext in `application.yml`; Token-Standardwerte lauten `mock-token` bzw. `mock-key-12345`.
- Der einzige Benutzer (`admin`) ist fest im Code hinterlegt.
- CORS ist im Backend deaktiviert (Kommentar: "Consider specific cors config for production"); im Mock ist CORS für alle Ursprünge aktiv.
- Der Bootstrap-Endpunkt gibt Exception-Meldungen an den Client zurück; `projectName` wird außer auf Nicht-Leere nicht validiert.
- nginx setzt keine Content-Security-Policy (Kommentar: "CSP ggf. projektspezifisch schärfen"). Die auf Server-Ebene definierten Sicherheitsheader werden in den `location`-Blöcken für `/index.html` und statische Assets nicht wirksam, da diese eigene `add_header`-Direktiven besitzen (nginx-Vererbungsregel).
- Der Header lädt das ArgoCD-Logo von einer externen URL (`argo-cd.readthedocs.io`).

## Requirements

### Requirement: Zustandslose Security-Filterkette
Das Backend SHALL eine Spring-Security-Filterkette mit `SessionCreationPolicy.STATELESS`, deaktiviertem CSRF-Schutz und deaktiviertem CORS verwenden und den `JwtAuthenticationFilter` vor dem `UsernamePasswordAuthenticationFilter` einhängen. Method Security MUST über `@EnableMethodSecurity` aktiviert sein.

#### Scenario: Keine Server-Session
- **WHEN** eine Anfrage verarbeitet wird
- **THEN** erzeugt das Backend keine HTTP-Session

### Requirement: JWT-Authentifizierung
Der `JwtAuthenticationFilter` SHALL einen Header `Authorization: Bearer <token>` auswerten, den Benutzernamen aus dem Claim `sub` lesen, den Benutzer über den `UserDetailsService` laden und bei gültigem Token eine Authentifizierung im `SecurityContext` setzen. Tokens MUST mit HMAC-SHA auf Basis von `jwt.secret` signiert und geprüft werden.

#### Scenario: Gültiges Token
- **WHEN** ein korrekt signiertes, nicht abgelaufenes Token mit `sub` = `admin` gesendet wird
- **THEN** wird der Benutzer `admin` im `SecurityContext` authentifiziert

#### Scenario: Ungültiges oder nicht auswertbares Token
- **WHEN** die Signaturprüfung oder das Parsen des Tokens fehlschlägt
- **THEN** wird `Unable to extract JWT token or token is invalid` als Warnung geloggt
- **AND** die Anfrage wird ohne Authentifizierung weiterverarbeitet

#### Scenario: Kein Bearer-Header
- **WHEN** kein `Authorization`-Header mit Präfix `Bearer ` vorhanden ist
- **THEN** wird die Anfrage ohne Authentifizierung weiterverarbeitet

#### Scenario: Token-Erzeugung
- **WHEN** `JwtTokenUtil.generateToken` aufgerufen wird
- **THEN** entsteht ein Token mit `sub` = Benutzername, `iat` = jetzt und `exp` = jetzt + `jwt.expiration` (86400000 ms)

### Requirement: Benutzerverwaltung (Platzhalter)
Der `CustomUserDetailsService` SHALL ausschließlich den Benutzer `admin` mit BCrypt-Passwort-Hash und ohne Rollen liefern und für alle anderen Namen eine `UsernameNotFoundException` werfen. Laut Code-Kommentar ist dies ein Platzhalter für eine spätere Datenbankabfrage.

#### Scenario: Unbekannter Benutzer
- **WHEN** ein Benutzername ungleich `admin` angefragt wird
- **THEN** wirft der Service `UsernameNotFoundException("User not found: <name>")`

### Requirement: Autorisierung (Ist-Zustand)
Das Backend SHALL derzeit keine Autorisierungsregeln erzwingen; die Endpunkte unter `/kubiverse/api/` sind ohne Token erreichbar.

#### Scenario: Aufruf ohne Token
- **WHEN** `GET /kubiverse/api/argocd/applications` oder `POST /kubiverse/api/bootstrap` ohne `Authorization`-Header aufgerufen wird
- **THEN** wird die Anfrage verarbeitet und nicht mit 401/403 abgewiesen

### Requirement: Authentifizierung gegenüber Fremdsystemen
Das Backend SHALL ausgehende Aufrufe authentifizieren: ArgoCD per `Authorization: Bearer {argocd.api-key}`, Bitbucket REST per `Authorization: Bearer {bitbucket.token}` und Git-Clone/-Push per Benutzer `x-token-auth` mit Passwort `{bitbucket.token}`. Die Zugangsdaten MUST über Konfiguration bzw. Umgebungsvariablen (`ARGOCD_API_KEY`, `BITBUCKET_TOKEN`) setzbar sein.

#### Scenario: Token per Umgebungsvariable
- **WHEN** `ARGOCD_API_KEY` bzw. `BITBUCKET_TOKEN` gesetzt sind
- **THEN** verwendet das Backend diese Werte statt der Standardwerte

### Requirement: Keine Preisgabe interner Fehlerdetails
Der `GlobalExceptionHandler` SHALL bei unerwarteten Fehlern nur generische Meldungen an den Client liefern und Details ausschließlich serverseitig loggen. Die Meldung einer `ArgoCdIntegrationException` MUST NOT an den Client gelangen.

#### Scenario: ArgoCD-Fehler
- **WHEN** eine `ArgoCdIntegrationException` auftritt
- **THEN** erhält der Client nur `{"message":"Internal server error","details":"An unexpected error occurred"}`

### Requirement: HTTP-Sicherheitsheader im Portal
nginx SHALL `server_tokens off` setzen und auf Server-Ebene die Header `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin` und `Permissions-Policy: camera=(), microphone=(), geolocation=()` definieren.

#### Scenario: Auslieferung über SPA-Fallback
- **WHEN** eine Route über `location /` ausgeliefert wird
- **THEN** enthält die Antwort die vier Sicherheitsheader
- **AND** die nginx-Version wird nicht preisgegeben

### Requirement: Sichere externe Links im Frontend
Das Frontend SHALL alle Links, die in einem neuen Tab geöffnet werden (`target="_blank"`), mit `rel="noopener noreferrer"` versehen.

#### Scenario: Klick auf externen Link
- **WHEN** der Nutzer einen ArgoCD-, Anwendungs- oder Dokumentationslink öffnet
- **THEN** hat die Zielseite keinen Zugriff auf `window.opener` und erhält keinen Referrer

### Requirement: Clientseitige Datenhaltung
Das Frontend SHALL ausschließlich Favoriten (Applikationsnamen) im `localStorage` speichern und keine Zugangsdaten oder Tokens clientseitig ablegen.

#### Scenario: Gespeicherte Daten
- **WHEN** der Nutzer Favoriten setzt
- **THEN** enthält `localStorage` nur den Schlüssel `kubiverse-favorites` mit einem JSON-Array von Namen
