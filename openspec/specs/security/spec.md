# security Specification

## Purpose

Beschreibt das im Code umgesetzte Sicherheitskonzept von Backend, Portal (nginx/SPA) und Mock sowie die daraus erkennbaren offenen Punkte.

**Umgesetzte Bausteine:**

- Spring Security mit zustandsloser Session-Verwaltung und JWT-Filter (`SecurityConfig`, `JwtAuthenticationFilter`, `JwtTokenUtil`, `CustomUserDetailsService`)
- Bearer-Token-Authentifizierung gegenüber ArgoCD
- Fehlerbehandlung ohne Stacktraces nach außen (`GlobalExceptionHandler`)
- nginx-Härtung (`server_tokens off`, Sicherheitsheader inklusive Content-Security-Policy auf allen Antworten über `security-headers.conf`)
- Externe Links im Frontend mit `rel="noopener noreferrer"`
- Secure Share: verschlüsselte Speicherung, Pflicht-Header `X-Kubiverse-Client` gegen Cross-Site-Anfragen, Anfragebegrenzung pro Client-IP, Ermittlung der Client-IP nur über vertrauenswürdige Proxys, Audit-Logger `AUDIT` (siehe `secure-share`)

**Aus dem Code erkennbare offene Punkte (Ist-Zustand, keine Soll-Vorgabe):**

- Es sind keine URL- oder Methoden-Autorisierungsregeln konfiguriert (`authorizeHttpRequests` fehlt, keine `@PreAuthorize`-Annotationen); alle Endpunkte sind ohne Authentifizierung aufrufbar.
- Es existiert kein Endpunkt, der JWTs ausstellt (`JwtTokenUtil.generateToken` wird nicht aufgerufen); das Frontend sendet keine Tokens.
- `jwt.secret` steht im Klartext in `application.yml`; für Datenbank-Zugangsdaten sind dort lokale Standardwerte hinterlegt (per `DB_*` überschreibbar); der ArgoCD-Token hat den Standardwert `mock-token` (im Backend-Image `mock-key-12345`).
- Der einzige Benutzer (`admin`) ist fest im Code hinterlegt.
- CORS ist im Backend deaktiviert (Kommentar: "Consider specific cors config for production"); im Mock ist CORS für alle Ursprünge aktiv.
- Die Content-Security-Policy erlaubt `'unsafe-inline'` für Styles (Inline-Styles in bestehenden Komponenten).
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
- **WHEN** `GET /kubiverse/api/argocd/applications` ohne `Authorization`-Header aufgerufen wird
- **THEN** wird die Anfrage verarbeitet und nicht mit 401/403 abgewiesen

### Requirement: Authentifizierung gegenüber Fremdsystemen
Das Backend SHALL ausgehende Aufrufe an ArgoCD per `Authorization: Bearer {argocd.api-key}` authentifizieren. Der API-Schlüssel MUST über die Umgebungsvariable `ARGOCD_API_KEY` setzbar sein.

#### Scenario: Token per Umgebungsvariable
- **WHEN** `ARGOCD_API_KEY` gesetzt ist
- **THEN** verwendet das Backend diesen Wert statt des Standardwerts

### Requirement: Keine Preisgabe interner Fehlerdetails
Der `GlobalExceptionHandler` SHALL bei unerwarteten Fehlern nur generische Meldungen an den Client liefern und Details ausschließlich serverseitig loggen. Die Meldung einer `ArgoCdIntegrationException` MUST NOT an den Client gelangen.

#### Scenario: ArgoCD-Fehler
- **WHEN** eine `ArgoCdIntegrationException` auftritt
- **THEN** erhält der Client nur `{"message":"Internal server error","details":"An unexpected error occurred"}`

### Requirement: HTTP-Sicherheitsheader im Portal
nginx SHALL `server_tokens off` setzen und für alle Antworten – einschließlich `/index.html`, statischer Assets und des SPA-Fallbacks – die Header `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` sowie eine `Content-Security-Policy` setzen. Die Content-Security-Policy MUST Skripte ausschließlich vom eigenen Ursprung zulassen, Verbindungen (`connect-src`) auf den eigenen Ursprung beschränken, `object-src 'none'` setzen und Einbettung nur durch den eigenen Ursprung erlauben.

#### Scenario: Auslieferung über SPA-Fallback
- **WHEN** eine Route über `location /` ausgeliefert wird
- **THEN** enthält die Antwort die Sicherheitsheader einschließlich `Content-Security-Policy`
- **AND** die nginx-Version wird nicht preisgegeben

#### Scenario: Auslieferung von index.html und Assets
- **WHEN** `/index.html` oder ein statisches Asset ausgeliefert wird
- **THEN** enthält die Antwort neben den Cache-Headern alle Sicherheitsheader

#### Scenario: Fremdes Skript
- **WHEN** eine Seite versucht, ein Skript von einem fremden Ursprung oder ein Inline-Skript auszuführen
- **THEN** blockiert der Browser die Ausführung

#### Scenario: Bestehende externe Ressourcen
- **WHEN** das Portal Web-Fonts von Google Fonts und das ArgoCD-Logo lädt
- **THEN** werden diese durch die Content-Security-Policy nicht blockiert

### Requirement: Sichere externe Links im Frontend
Das Frontend SHALL alle Links, die in einem neuen Tab geöffnet werden (`target="_blank"`), mit `rel="noopener noreferrer"` versehen.

#### Scenario: Klick auf externen Link
- **WHEN** der Nutzer einen ArgoCD-, Anwendungs- oder Dokumentationslink öffnet
- **THEN** hat die Zielseite keinen Zugriff auf `window.opener` und erhält keinen Referrer

### Requirement: Clientseitige Datenhaltung
Das Frontend SHALL ausschließlich Favoriten (Applikationsnamen) im `localStorage` speichern und keine Zugangsdaten, Tokens, Freigabelinks, Share-Passwörter oder Share-Inhalte clientseitig dauerhaft ablegen.

#### Scenario: Gespeicherte Daten
- **WHEN** der Nutzer Favoriten setzt
- **THEN** enthält `localStorage` nur den Schlüssel `kubiverse-favorites` mit einem JSON-Array von Namen

#### Scenario: Nutzung von Secure Share
- **WHEN** der Nutzer einen Share erstellt oder abruft
- **THEN** werden weder Freigabelink, Zugriffsgeheimnis, Passwort noch Inhalt in `localStorage` oder `sessionStorage` gespeichert

### Requirement: Schutz der Secure-Share-Endpunkte vor Cross-Site-Anfragen
Das Backend SHALL Anfragen an Secure-Share-Endpunkte nur mit dem Header `X-Kubiverse-Client: portal` verarbeiten. Dadurch lösen browserseitige Cross-Origin-Anfragen einen CORS-Preflight aus, den das Backend nicht freigibt.

#### Scenario: Formular-Post von fremder Website
- **WHEN** eine fremde Website den Browser eines Nutzers veranlasst, eine Anfrage an `/kubiverse/api/shares` zu senden
- **THEN** wird kein Share erstellt und kein Inhalt ausgeliefert

### Requirement: Ermittlung der Client-IP-Adresse
Das Backend SHALL die Client-IP-Adresse für Anfragebegrenzung und Audit-Logs aus Weiterleitungs-Headern nur dann übernehmen, wenn die Anfrage von einer als vertrauenswürdig konfigurierten Proxy-Adresse stammt; andernfalls MUST die Adresse der direkten Gegenstelle verwendet werden.

#### Scenario: Gefälschter Weiterleitungs-Header
- **WHEN** ein Client von einer nicht vertrauenswürdigen Adresse einen `X-Forwarded-For`-Header mitsendet
- **THEN** ignoriert das Backend diesen Header für Anfragebegrenzung und Audit-Logs

### Requirement: Log-Hygiene
Das Backend SHALL sicherstellen, dass keine Log-Ausgabe – einschließlich Fehler- und Stacktrace-Ausgaben – Share-Inhalte, Dateinamen, Passwörter, Zugriffsgeheimnisse oder Schlüsselmaterial enthält.

#### Scenario: Fehler bei der Verarbeitung
- **WHEN** beim Erstellen oder Abrufen eines Shares eine Ausnahme auftritt und protokolliert wird
- **THEN** enthält der Log-Eintrag keine vertraulichen Share-Daten
