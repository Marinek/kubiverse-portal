# Spec Delta

## MODIFIED Requirements

### Requirement: Komponententrennung
Das System SHALL aus getrennt baubaren und betreibbaren Komponenten bestehen: Portal (Frontend), Server (Backend) und Mock (Simulation externer Systeme). Secure Share speichert Daten flüchtig im Backendprozess; PostgreSQL ist keine Laufzeitkomponente.

#### Scenario: Start aller Komponenten
- **WHEN** `docker-compose up -d --build` im Repository-Root ausgeführt wird
- **THEN** werden die Container `mock`, `server` und `portal` gebaut bzw. gestartet
- **AND** `server` startet nach `mock` und `portal` startet nach `mock` und `server`
- **AND** es wird keine Datenbank gestartet

## REMOVED Requirements

### Requirement: Datenbankbetrieb nur für Secure Share
Das Backend SHALL im Standardprofil `no-db` ohne Datenbank starten; in diesem Profil ist Secure Share nicht verfügbar. In jedem anderen Profil MUST das Backend eine PostgreSQL-Datenbank nutzen, in der ausschließlich Secure-Share-Daten (Entität `SecureShare`) gespeichert werden.

#### Scenario: Start im Profil no-db
- **WHEN** `SPRING_PROFILES_ACTIVE` nicht gesetzt oder `no-db` ist
- **THEN** sind `DataSourceAutoConfiguration` und `HibernateJpaAutoConfiguration` ausgeschlossen
- **AND** das Backend startet ohne Datenbankverbindung

#### Scenario: Start mit Datenbank
- **WHEN** `SPRING_PROFILES_ACTIVE` einen anderen Wert als `no-db` hat (Docker Compose: `db`)
- **THEN** verbindet sich das Backend mit der unter `DB_URL` konfigurierten Datenbank und stellt Secure Share bereit

**Reason**: Secure Share benötigt künftig keine relationale Datenbank und funktioniert mit einem flüchtigen Speicher im einzelnen Backendprozess.
**Migration**: Das `no-db`-Profil als Funktionsschalter und die PostgreSQL-Profilkonfiguration werden entfernt; Secure Share läuft standardmäßig ohne Datenbank.

## ADDED Requirements

### Requirement: Secure Share ohne Datenbank
Das Backend SHALL Secure Share im Standardbetrieb mit einem flüchtigen In-Memory-Speicher bereitstellen und MUST keine PostgreSQL- oder JPA-Verbindung voraussetzen. Aktive Shares MUST bei Ende oder Neustart des Backendprozesses verloren gehen.

#### Scenario: Start ohne Datenbank
- **WHEN** das Backend mit der Standardkonfiguration gestartet wird und PostgreSQL nicht verfügbar ist
- **THEN** startet das Backend ohne Datenbankverbindung
- **AND** Secure Share, Application Hub und Projekt-Bootstrap bleiben verfügbar

#### Scenario: Neustart des Backendprozesses
- **WHEN** der Backendprozess neu gestartet wird
- **THEN** sind zuvor aktive Shares nicht mehr verfügbar