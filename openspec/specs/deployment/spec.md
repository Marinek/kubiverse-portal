# deployment Specification

## Purpose

Beschreibt Build, Konfiguration und Betrieb von Portal, Backend und Mock über Docker-Images und `docker-compose.yml`. Kubernetes-Manifeste sind im Repository nicht enthalten.

**Konfigurationsparameter Backend** (`server/src/main/resources/application.yml`):

| Property | Umgebungsvariable | Standardwert |
|---|---|---|
| `server.port` | – | `8080` |
| `argocd.url` | `ARGOCD_URL` | `http://localhost:12004` |
| `argocd.api-key` | `ARGOCD_API_KEY` | `mock-token` |
| `bitbucket.api-url` | `BITBUCKET_API_URL` | `http://localhost:7990/rest/api/1.0` |
| `bitbucket.project` | `BITBUCKET_PROJECT` | `FMS` |
| `bitbucket.template-repo-url` | `BITBUCKET_TEMPLATE_REPO` | `http://localhost:7990/scm/fms/template.git` |
| `bitbucket.token` | `BITBUCKET_TOKEN` | `mock-token` |
| `jwt.secret` | – | im Klartext in `application.yml` |
| `jwt.expiration` | – | `86400000` (24 h) |
| `spring.servlet.multipart.max-file-size` / `max-request-size` | – | `10MB` / `11MB` |
| `server.tomcat.remoteip.internal-proxies` | `SECURE_SHARE_TRUSTED_PROXIES` | `127.0.0.1` und `::1` |
| `secure-share.master-key` / `master-key-id` | `SECURE_SHARE_MASTER_KEY` / `SECURE_SHARE_MASTER_KEY_ID` | kein Standardwert / `k1` |
| `secure-share.previous-master-key` / `previous-master-key-id` | `SECURE_SHARE_PREVIOUS_MASTER_KEY` / `SECURE_SHARE_PREVIOUS_MASTER_KEY_ID` | leer |
| `secure-share.rate-limit.create-per-hour` / `access-per-hour` | `SECURE_SHARE_RATE_LIMIT_CREATE_PER_HOUR` / `SECURE_SHARE_RATE_LIMIT_ACCESS_PER_HOUR` | `20` / `60` |
| `secure-share.capacity.max-shares` / `max-total-bytes` | `SECURE_SHARE_MAX_SHARES` / `SECURE_SHARE_MAX_TOTAL_BYTES` | `1000` / `268435456` (256 MiB) |

**Build-Argumente Portal** (zur Build-Zeit in das Bundle eingebettet): `VITE_ARGOCD_UI_URL`, `VITE_TEAMS_CHAT_URL`, `VITE_DOCS_DEPLOYMENT_GUIDE_URL`, `VITE_DOCS_GIT_CONVENTIONS_URL`, `VITE_DOCS_CICD_PIPELINE_URL`, `VITE_DOCS_TROUBLESHOOTING_URL`.

## Requirements

### Requirement: Docker-Compose-Orchestrierung
Das Repository SHALL eine `docker-compose.yml` bereitstellen, die `mock` (Port 12004), `server` (Port 8080) und `portal` (Port 80) mit `restart: unless-stopped` startet und das Backend gegen den Mock konfiguriert. Die Compose-Konfiguration MUST keinen PostgreSQL-Dienst und kein persistentes Share-Daten-Volume bereitstellen. Es MUST genau eine Backendinstanz für Secure Share betrieben werden.

#### Scenario: Lokaler Gesamtstart
- **WHEN** `docker-compose up -d --build` (oder `podman compose up -d --build`) ausgeführt wird
- **THEN** ist das Portal unter `http://localhost`, das Backend unter `http://localhost:8080` und der Mock unter `http://localhost:12004` erreichbar
- **AND** der Server verwendet `ARGOCD_URL=http://mock:12004`
- **AND** `BITBUCKET_*` sind per Host-Umgebung überschreibbar und zeigen standardmäßig auf den Mock
- **AND** `server` startet nach `mock`
- **AND** es wird kein PostgreSQL-Container gestartet

#### Scenario: Persistenz über Neustarts
- **WHEN** der Backendcontainer neu gestartet wird
- **THEN** sind davor aktive Shares nicht mehr abrufbar
- **AND** Portal und Backend starten ohne PostgreSQL-Container

### Requirement: Backend-Image
Das Backend SHALL über ein zweistufiges Dockerfile gebaut werden: Build mit `gradle:9-jdk21-alpine` (`gradle build -x test --no-daemon`), Laufzeit mit `eclipse-temurin:21-jre-alpine`, Start per `java -jar app.jar` auf Port 8080.

#### Scenario: Image-Build
- **WHEN** das Backend-Image gebaut wird
- **THEN** werden Tests übersprungen und das `*SNAPSHOT.jar` als `app.jar` in das Laufzeit-Image kopiert
- **AND** die Standard-Umgebungsvariablen `ARGOCD_URL=http://localhost:12004` und `ARGOCD_API_KEY=mock-key-12345` sind gesetzt

### Requirement: Portal-Image
Das Portal SHALL über ein zweistufiges Dockerfile gebaut werden: Build mit `node:24-alpine` (`npm ci`, `npm run build`, `NODE_ENV=production`), Auslieferung mit `nginx:1.29-alpine` aus `/usr/share/nginx/html` auf Port 80 mit eigener `nginx.conf`.

#### Scenario: Build-Zeit-Konfiguration
- **WHEN** das Portal-Image mit `VITE_*`-Build-Argumenten gebaut wird
- **THEN** sind die Werte fest im ausgelieferten JavaScript-Bundle enthalten und zur Laufzeit nicht änderbar

### Requirement: nginx-Auslieferung und Reverse Proxy
nginx SHALL die SPA ausliefern und Anfragen unter `/kubiverse/api/` an `http://server:8080` weiterleiten, inklusive der Header `Host`, `X-Real-IP`, `X-Forwarded-For` und `X-Forwarded-Proto`. Für `/kubiverse/api/` MUST eine maximale Request-Größe gelten, die Uploads bis 10 MB zulässt.

#### Scenario: SPA-Fallback
- **WHEN** ein unbekannter Pfad angefragt wird
- **THEN** liefert nginx `index.html` aus

#### Scenario: Caching
- **WHEN** `/index.html` ausgeliefert wird
- **THEN** werden `Cache-Control: no-cache, no-store, must-revalidate`, `Pragma: no-cache` und `Expires: 0` gesetzt
- **WHEN** statische Assets (js, css, Bilder, Fonts, map) ausgeliefert werden
- **THEN** wird `Cache-Control: public, max-age=31536000, immutable` gesetzt

#### Scenario: Kompression
- **WHEN** Text-, CSS-, JavaScript-, JSON-, XML- oder SVG-Inhalte ab 256 Byte ausgeliefert werden
- **THEN** komprimiert nginx sie mit gzip (Level 6)

#### Scenario: Upload bis 10 MB
- **WHEN** ein Share mit einer 10 MB großen Datei erstellt wird
- **THEN** leitet nginx die Anfrage an das Backend weiter, ohne sie mit HTTP 413 abzulehnen

#### Scenario: Deutlich zu großer Upload
- **WHEN** eine Anfrage an `/kubiverse/api/` die maximale Request-Größe überschreitet
- **THEN** lehnt nginx sie mit HTTP 413 ab

### Requirement: Mock-Image
Der Mock SHALL mit `node:24-alpine` gebaut (`npm ci`) und per `npm start` auf Port 12004 gestartet werden.

#### Scenario: Start des Mocks
- **WHEN** der Mock-Container startet
- **THEN** führt er `node server.js` aus und meldet `ArgoCD Mock Server running on http://localhost:12004`

### Requirement: Lokale Frontend-Entwicklung
Das Portal SHALL per `npm run dev` mit dem Vite-Dev-Server (Host `::`, Port 8080) startbar sein und `/kubiverse/api` an `http://localhost:8080` weiterleiten.

#### Scenario: Portkonflikt mit dem Backend
- **WHEN** Vite-Dev-Server und Backend gleichzeitig lokal ohne Container gestartet werden
- **THEN** beanspruchen beide den Port 8080, da Dev-Server-Port und Proxy-Ziel identisch konfiguriert sind

### Requirement: Konfiguration Secure Share
Das Backend SHALL Secure Share über Umgebungsvariablen konfigurieren. Verschlüsselungsschlüssel (`SECURE_SHARE_MASTER_KEY`, `SECURE_SHARE_MASTER_KEY_ID`, optional `SECURE_SHARE_PREVIOUS_MASTER_KEY`, `SECURE_SHARE_PREVIOUS_MASTER_KEY_ID`), Anfrage- und Kapazitätsgrenzen sowie vertrauenswürdige Proxy-Adressen MUST ohne Codeänderung setzbar sein. Die Standardkapazität MUST höchstens 256 MiB betragen. Für den Verschlüsselungsschlüssel MUST NOT ein Standardwert im Repository hinterlegt sein. Secure Share MUST ohne Datenbankzugangsdaten starten.

#### Scenario: Fehlender Verschlüsselungsschlüssel
- **WHEN** das Backend ohne gültigen `SECURE_SHARE_MASTER_KEY` gestartet wird
- **THEN** bricht der Start mit einer eindeutigen Fehlermeldung ab, die den Schlüsselwert nicht enthält

#### Scenario: Angepasste Grenzwerte
- **WHEN** Anfrage- oder Kapazitätsgrenzen per Umgebungsvariable gesetzt werden
- **THEN** wendet das Backend diese statt der Standardwerte an

#### Scenario: Schlüsselrotation
- **WHEN** ein neuer Schlüssel als aktueller und der bisherige als vorheriger Schlüssel konfiguriert wird
- **THEN** werden neue Shares mit dem neuen Schlüssel verschlüsselt und aktive Shares mit dem vorherigen Schlüssel bleiben bis zu ihrem Ablauf abrufbar

### Requirement: Einzelinstanzbetrieb für Secure Share
Secure Share MUST mit genau einer Backendinstanz betrieben werden, da der flüchtige Speicher nur innerhalb eines Prozesses verfügbar ist.

#### Scenario: Betrieb mit einer Backendinstanz
- **WHEN** eine Share-Erstellung oder ein Share-Abruf in der Compose-Umgebung erfolgt
- **THEN** verarbeitet dieselbe Backendinstanz die Anfrage und hält den zugehörigen Share im Arbeitsspeicher

### Requirement: Umgang mit verbliebenem PostgreSQL-Volume
Die Deployment-Dokumentation SHALL darauf hinweisen, dass ein aus einer früheren Compose-Konfiguration stammendes `db-data`-Volume durch das Entfernen des Datenbankdienstes nicht automatisch gelöscht wird. Sie MUST einen ausdrücklich manuellen und auf dieses Volume begrenzten Bereinigungsschritt beschreiben und vor dem unwiederbringlichen Löschen vorhandener Daten warnen.

#### Scenario: Upgrade einer bestehenden Compose-Installation
- **WHEN** eine bestehende Installation auf die Compose-Konfiguration ohne PostgreSQL aktualisiert wird
- **THEN** startet die neue Konfiguration keinen PostgreSQL-Dienst und bindet kein altes Share-Volume ein
- **AND** die Dokumentation erklärt, wie das verwaiste alte Volume nach Prüfung manuell gelöscht werden kann
