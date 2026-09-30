# deployment Specification

## Purpose

Beschreibt Build, Konfiguration und Betrieb der drei Komponenten über Docker-Images und `docker-compose.yml`. Kubernetes-Manifeste sind im Repository nicht enthalten.

**Konfigurationsparameter Backend** (`server/src/main/resources/application.yml`):

| Property | Umgebungsvariable | Standardwert |
|---|---|---|
| `server.port` | – | `8080` |
| `spring.profiles.active` | `SPRING_PROFILES_ACTIVE` | `no-db` |
| `argocd.url` | `ARGOCD_URL` | `http://localhost:12004` |
| `argocd.api-key` | `ARGOCD_API_KEY` | `mock-token` |
| `bitbucket.api-url` | `BITBUCKET_API_URL` | `http://localhost:7990/rest/api/1.0` |
| `bitbucket.project` | `BITBUCKET_PROJECT` | `FMS` |
| `bitbucket.template-repo-url` | `BITBUCKET_TEMPLATE_REPO` | `http://localhost:7990/scm/fms/template.git` |
| `bitbucket.token` | `BITBUCKET_TOKEN` | `mock-token` |
| `jwt.secret` | – | im Klartext in `application.yml` |
| `jwt.expiration` | – | `86400000` (24 h) |
| `spring.datasource.*` | – | `jdbc:postgresql://localhost:12002/kubiverse-portal` (nur ohne Profil `no-db` relevant) |

**Build-Argumente Portal** (zur Build-Zeit in das Bundle eingebettet): `VITE_ARGOCD_UI_URL`, `VITE_TEAMS_CHAT_URL`, `VITE_DOCS_DEPLOYMENT_GUIDE_URL`, `VITE_DOCS_GIT_CONVENTIONS_URL`, `VITE_DOCS_CICD_PIPELINE_URL`, `VITE_DOCS_TROUBLESHOOTING_URL`.

## Requirements

### Requirement: Docker-Compose-Orchestrierung
Das Repository SHALL eine `docker-compose.yml` bereitstellen, die `mock` (Port 12004), `server` (Port 8080) und `portal` (Port 80) mit `restart: unless-stopped` startet und das Backend gegen den Mock konfiguriert.

#### Scenario: Lokaler Gesamtstart
- **WHEN** `docker-compose up -d --build` (oder `podman compose up -d --build`) ausgeführt wird
- **THEN** ist das Portal unter `http://localhost`, das Backend unter `http://localhost:8080` und der Mock unter `http://localhost:12004` erreichbar
- **AND** der Server verwendet `ARGOCD_URL=http://mock:12004` und `SPRING_PROFILES_ACTIVE=no-db`
- **AND** `BITBUCKET_*` sind per Host-Umgebung überschreibbar und zeigen standardmäßig auf den Mock

### Requirement: Backend-Image
Das Backend SHALL über ein zweistufiges Dockerfile gebaut werden: Build mit `gradle:9-jdk21-alpine` (`gradle build -x test --no-daemon`), Laufzeit mit `eclipse-temurin:21-jre-alpine`, Start per `java -jar app.jar` auf Port 8080.

#### Scenario: Image-Build
- **WHEN** das Backend-Image gebaut wird
- **THEN** werden Tests übersprungen und das `*SNAPSHOT.jar` als `app.jar` in das Laufzeit-Image kopiert
- **AND** die Standard-Umgebungsvariablen `SPRING_PROFILES_ACTIVE=no-db`, `ARGOCD_URL=http://localhost:12004`, `ARGOCD_API_KEY=mock-key-12345` sind gesetzt

### Requirement: Portal-Image
Das Portal SHALL über ein zweistufiges Dockerfile gebaut werden: Build mit `node:24-alpine` (`npm ci`, `npm run build`, `NODE_ENV=production`), Auslieferung mit `nginx:1.29-alpine` aus `/usr/share/nginx/html` auf Port 80 mit eigener `nginx.conf`.

#### Scenario: Build-Zeit-Konfiguration
- **WHEN** das Portal-Image mit `VITE_*`-Build-Argumenten gebaut wird
- **THEN** sind die Werte fest im ausgelieferten JavaScript-Bundle enthalten und zur Laufzeit nicht änderbar

### Requirement: nginx-Auslieferung und Reverse Proxy
nginx SHALL die SPA ausliefern und Anfragen unter `/kubiverse/api/` an `http://server:8080` weiterleiten, inklusive der Header `Host`, `X-Real-IP`, `X-Forwarded-For` und `X-Forwarded-Proto`.

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
