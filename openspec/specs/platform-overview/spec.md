# platform-overview Specification

## Purpose

Beschreibt Zweck, Architektur und Komponenten des Kubiverse Portals auf Basis des vorhandenen Codes.

**Zweck:** Das Kubiverse Portal ("FMS-Kubiverse – DevOps Portal") ist ein internes Web-Portal für die Kubernetes-basierte Deployment-Plattform für Formularmanagement-Projekte. Es bietet im Code umgesetzt:

- eine informative Startseite (Plattformbeschreibung, Deployment-Anleitung, Dokumentations- und Supportlinks),
- einen "Application Hub", der ArgoCD-Applikationen samt Sync-/Health-Status anzeigt,
- die Initialisierung neuer Projekte (Bitbucket-Repository anlegen und mit Template-Inhalt befüllen).

**Architektur (Drei-Komponenten-System):**

```
Browser ──HTTP:80──> portal (nginx, React-SPA)
                         │  /kubiverse/api/*  (Reverse Proxy)
                         ▼
                     server (Spring Boot, :8080)
                         │  REST (ArgoCD API, Bitbucket REST API)
                         │  Git over HTTP (JGit)
                         ▼
          ArgoCD / Bitbucket  – lokal ersetzt durch –  mock (Express, :12004)
```

| Komponente | Verzeichnis | Technologie | Port |
|---|---|---|---|
| Portal (Frontend) | `portal/` | React 18, TypeScript, Vite 5, Tailwind CSS, shadcn/ui (Radix UI), TanStack React Query, React Router (HashRouter) | 80 (nginx) |
| Server (Backend) | `server/` | Java 21, Spring Boot 3.4.2, Spring Web, Spring Security, JJWT 0.12.5, JGit 6.8, Lombok, Gradle | 8080 |
| Mock | `mock/` | Node.js, Express 5, cors | 12004 |

**Backend-Paketstruktur** (`com.kubiverse.portal.server`): `config` (ArgoCD-Konfiguration), `controller` (REST-Endpunkte), `service` (Geschäftslogik), `dto` (Request/Response-Objekte), `exception` (globale Fehlerbehandlung), `security` (JWT, Security-Filterkette).

**Frontend-Struktur** (`portal/src`): `pages` (Routen-Seiten `Index`, `ArgoCdApplications`, `NotFound`), `components` (Seitenabschnitte `Header`, `Hero`, `KubiverseSection`, `DeploymentGuide`, `DocumentationSection`, `Footer`), `components/ui` (shadcn/ui-Bibliothek), `hooks`, `lib/utils.ts`.

## Requirements

### Requirement: Komponententrennung
Das System SHALL aus drei getrennt baubaren und betreibbaren Komponenten bestehen: Portal (Frontend), Server (Backend) und Mock (Simulation externer Systeme).

#### Scenario: Start aller Komponenten
- **WHEN** `docker-compose up -d --build` im Repository-Root ausgeführt wird
- **THEN** werden die Container `mock`, `server` und `portal` gebaut und gestartet
- **AND** `server` startet nach `mock`, `portal` startet nach `mock` und `server` (`depends_on`)

### Requirement: Frontend kommuniziert ausschließlich über das Backend
Das Frontend SHALL Daten ausschließlich über relative Pfade unter `/kubiverse/api/` vom Backend beziehen und MUST NOT ArgoCD oder Bitbucket direkt per API aufrufen.

#### Scenario: Laden der Applikationen
- **WHEN** der Application Hub geöffnet wird
- **THEN** ruft das Frontend `GET /kubiverse/api/argocd/applications` auf
- **AND** nginx leitet die Anfrage an `http://server:8080` weiter

#### Scenario: Projekt initialisieren
- **WHEN** der Nutzer ein Projekt über das Formular initialisiert
- **THEN** ruft das Frontend `POST /kubiverse/api/bootstrap` auf

### Requirement: Backend als Integrationsschicht
Das Backend SHALL die Integration mit ArgoCD (REST, lesend) und Bitbucket (REST zum Anlegen von Repositories, Git über JGit) kapseln und dem Frontend aufbereitete Daten liefern.

#### Scenario: Aufbereitung von ArgoCD-Daten
- **WHEN** das Backend die ArgoCD-Applikationsliste abruft
- **THEN** reduziert es jede Applikation auf die Felder `name`, `project`, `syncStatus`, `healthStatus`, `argocdUrl`, `externalUrls`

### Requirement: Schichtenarchitektur im Backend
Das Backend SHALL Controller (HTTP-Schnittstelle), Services (Geschäfts- und Integrationslogik) und DTOs (Datentransfer) trennen und Abhängigkeiten per Konstruktorinjektion (`@RequiredArgsConstructor`) beziehen.

#### Scenario: Controller delegiert an Service
- **WHEN** `ArgoCdController` oder `ProjectBootstrapController` eine Anfrage erhält
- **THEN** delegiert der Controller die Verarbeitung an `ArgoCdService` bzw. `ProjectBootstrapService`

### Requirement: Kein aktiver Datenbankbetrieb
Das Backend SHALL im Standardprofil `no-db` ohne Datenbank starten; JPA- und PostgreSQL-Abhängigkeiten sind vorhanden, aber es existieren keine Entitäten oder Repositories.

#### Scenario: Start im Profil no-db
- **WHEN** `SPRING_PROFILES_ACTIVE` nicht gesetzt oder `no-db` ist
- **THEN** sind `DataSourceAutoConfiguration` und `HibernateJpaAutoConfiguration` ausgeschlossen
- **AND** das Backend startet ohne Datenbankverbindung
