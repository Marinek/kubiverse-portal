# Spec Delta

## MODIFIED Requirements

### Requirement: Docker-Compose-Orchestrierung
Das Repository SHALL eine `docker-compose.yml` bereitstellen, die `db` (PostgreSQL mit persistentem Volume, nicht auf dem Host veröffentlicht), `mock` (Port 12004), `server` (Port 8080) und `portal` (Port 80) mit `restart: unless-stopped` startet, das Backend gegen den Mock konfiguriert und Secure Share mit Datenbank und Verschlüsselungsschlüssel betreibt.

#### Scenario: Lokaler Gesamtstart
- **WHEN** `docker-compose up -d --build` (oder `podman compose up -d --build`) ausgeführt wird
- **THEN** ist das Portal unter `http://localhost`, das Backend unter `http://localhost:8080` und der Mock unter `http://localhost:12004` erreichbar
- **AND** der Server verwendet `ARGOCD_URL=http://mock:12004` und ein Profil mit Datenbank (nicht `no-db`)
- **AND** `BITBUCKET_*` sind per Host-Umgebung überschreibbar und zeigen standardmäßig auf den Mock
- **AND** `server` startet nach `db` und `mock`

#### Scenario: Persistenz über Neustarts
- **WHEN** die Container neu gestartet werden
- **THEN** bleiben noch nicht abgelaufene Shares erhalten

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

## ADDED Requirements

### Requirement: Konfiguration Secure Share
Das Backend SHALL Secure Share über Umgebungsvariablen konfigurieren. Datenbankzugang (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`), Verschlüsselungsschlüssel (`SECURE_SHARE_MASTER_KEY`, `SECURE_SHARE_MASTER_KEY_ID`, optional `SECURE_SHARE_PREVIOUS_MASTER_KEY`, `SECURE_SHARE_PREVIOUS_MASTER_KEY_ID`), Anfrage- und Kapazitätsgrenzen sowie vertrauenswürdige Proxy-Adressen MUST ohne Codeänderung setzbar sein. Für den Verschlüsselungsschlüssel MUST NOT ein Standardwert im Repository hinterlegt sein.

#### Scenario: Fehlender Verschlüsselungsschlüssel
- **WHEN** das Backend in einem Profil mit Datenbank ohne gültigen `SECURE_SHARE_MASTER_KEY` gestartet wird
- **THEN** bricht der Start mit einer eindeutigen Fehlermeldung ab, die den Schlüsselwert nicht enthält

#### Scenario: Angepasste Grenzwerte
- **WHEN** Anfrage- oder Kapazitätsgrenzen per Umgebungsvariable gesetzt werden
- **THEN** wendet das Backend diese statt der Standardwerte an

#### Scenario: Schlüsselrotation
- **WHEN** ein neuer Schlüssel als aktueller und der bisherige als vorheriger Schlüssel konfiguriert wird
- **THEN** werden neue Shares mit dem neuen Schlüssel verschlüsselt und bestehende Shares bleiben bis zu ihrem Ablauf abrufbar
