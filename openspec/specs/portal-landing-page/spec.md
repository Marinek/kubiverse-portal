# portal-landing-page Specification

## Purpose

Die Startseite (Route `/`, Seite `Index`) informiert über das FMS-Kubiverse und führt zu Deployment-Anleitung, Dokumentation und Application Hub. Sie besteht aus den Komponenten `Header`, `Hero`, `KubiverseSection`, `DeploymentGuide`, `DocumentationSection` und `Footer`. Inhalte sind – abgesehen von über `VITE_*`-Variablen konfigurierbaren Links – statisch im Code hinterlegt.

## Requirements

### Requirement: Routing
Das Frontend SHALL React Router mit `HashRouter` verwenden und die Routen `/` (`Index`), `/argocd` (`ArgoCdApplications`) sowie `*` (`NotFound`) bereitstellen.

#### Scenario: Unbekannte Route
- **WHEN** eine nicht definierte Route aufgerufen wird
- **THEN** zeigt die Seite `NotFound` den Text `404` / `Oops! Page not found` mit Link zur Startseite
- **AND** der Pfad wird per `console.error` protokolliert

### Requirement: Header-Navigation
Der Header SHALL die Marke `FMS-Kubiverse – DevOps Portal`, Anker-Links zu den Abschnitten `kubiverse`, `deployment` und `documentation`, einen Button `Application Hub` (Link auf `/argocd`) und optional einen Button `ArgoCD` anzeigen.

#### Scenario: Anker-Navigation von einer Unterseite
- **WHEN** der Nutzer auf einer anderen Route als `/` einen Anker-Link klickt
- **THEN** navigiert die App zu `/` und scrollt nach 100 ms sanft zum Zielabschnitt

#### Scenario: ArgoCD-Button
- **WHEN** `VITE_ARGOCD_UI_URL` zur Build-Zeit gesetzt ist
- **THEN** zeigt der Header einen Button `ArgoCD`, der die URL in einem neuen Tab öffnet
- **WHEN** `VITE_ARGOCD_UI_URL` nicht gesetzt ist
- **THEN** wird der Button nicht angezeigt

### Requirement: Hero-Bereich
Der Hero-Bereich SHALL die Überschrift `Willkommen im FMS-Kubiverse` mit Hintergrundbild sowie die Buttons `Projekt deployen` und `Dokumentation ansehen` anzeigen.

#### Scenario: Button-Navigation
- **WHEN** der Nutzer `Projekt deployen` bzw. `Dokumentation ansehen` klickt
- **THEN** scrollt die Seite sanft zum Abschnitt `deployment` bzw. `documentation`

### Requirement: Abschnitt "Was ist das Kubiverse?"
Der Abschnitt `kubiverse` SHALL die Plattform beschreiben und sechs Feature-Karten (Kubernetes-Cluster, Skalierbarkeit, CI/CD-Integration, Isolierte Testumgebungen, Internes Hosting, URL-Generierung) sowie einen Hinweis zur Bitbucket-/CI/CD-Integration anzeigen.

#### Scenario: Anzeige
- **WHEN** die Startseite geladen wird
- **THEN** werden die sechs Feature-Karten als Raster dargestellt

### Requirement: Abschnitt "Projekt veröffentlichen"
Der Abschnitt `deployment` SHALL eine Anleitung in fünf Schritten anzeigen: 01 Neues Projekt in Bitbucket anlegen, 02 Branch pushen, 03 CI/CD-Pipeline automatisch ausgelöst, 04 Deployment in eigenem Namespace, 05 Zugriff über generierte URL. Schritt 01 MUST das Formular zur Projektinitialisierung enthalten (siehe `project-bootstrap`).

#### Scenario: Anzeige der Schritte
- **WHEN** die Startseite geladen wird
- **THEN** werden die fünf Schritte mit Nummer, Icon, Titel, Beschreibung und Detailpunkten angezeigt

#### Scenario: Button "Deployment starten"
- **WHEN** der Nutzer den Button `Deployment starten` klickt
- **THEN** erfolgt keine Aktion (kein Handler im Code hinterlegt)

### Requirement: Abschnitt "Dokumentation & Hilfe"
Der Abschnitt `documentation` SHALL vier Dokumentationslinks (Deployment-Guide, Git-Konventionen, CI/CD Pipeline-Konfiguration, Troubleshooting mit Badge `Wichtig`) sowie eine Support-Karte `DevOps-Team` mit Mail-Kontakt anzeigen.

#### Scenario: Konfigurierte Dokumentationslinks
- **WHEN** `VITE_DOCS_DEPLOYMENT_GUIDE_URL`, `VITE_DOCS_GIT_CONVENTIONS_URL`, `VITE_DOCS_CICD_PIPELINE_URL` bzw. `VITE_DOCS_TROUBLESHOOTING_URL` gesetzt sind
- **THEN** verweist der jeweilige Link darauf und öffnet sich in einem neuen Tab
- **WHEN** eine Variable nicht gesetzt ist
- **THEN** verweist der Link auf `#`

#### Scenario: Teams-Chat
- **WHEN** `VITE_TEAMS_CHAT_URL` gesetzt ist
- **THEN** zeigt die Support-Karte einen Link `Chat öffnen`
- **WHEN** die Variable nicht gesetzt ist
- **THEN** wird der Link nicht angezeigt

### Requirement: Footer
Der Footer SHALL Markenbeschreibung, Anker-Links (Plattform), Mail-Links (Support), Copyright, eine statische Versionsangabe `Version 2.1.0` und eine statische Anzeige `System Online` enthalten.

#### Scenario: Statusanzeige
- **WHEN** der Footer gerendert wird
- **THEN** wird `System Online` angezeigt, ohne dass ein Systemstatus abgefragt wird
