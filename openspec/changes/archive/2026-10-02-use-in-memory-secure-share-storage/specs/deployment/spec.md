# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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