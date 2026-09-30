# mock-server Specification

## Purpose

Der Mock (`mock/server.js`, Express 5) simuliert die vom Backend genutzten Endpunkte von ArgoCD und Bitbucket Server, damit das System ohne echten ArgoCD-Cluster und ohne Bitbucket lauffähig ist. Er lauscht auf `PORT` (Standard `12004`), aktiviert CORS für alle Ursprünge und parst JSON-Bodies. Git-Transport (Clone/Push) wird nicht simuliert.

## Requirements

### Requirement: ArgoCD-Applikationsliste simulieren
Der Mock SHALL unter `GET /api/v1/applications` nach 500 ms Verzögerung eine statische Liste `{"items":[...]}` mit sechs Applikationen im ArgoCD-Format liefern.

#### Scenario: Abruf der Mock-Applikationen
- **WHEN** `GET /api/v1/applications` aufgerufen wird
- **THEN** enthält die Antwort die Applikationen `kubiverse-frontend`, `kubiverse-backend` (Projekt `kubiverse`), `payment-service`, `billing-ui` (Projekt `finance`), `legacy-app`, `mail-server` (Projekt `default`)
- **AND** jede Applikation enthält `metadata`, `spec.project`, `status.health`, `status.sync` und `status.summary.externalURLs`
- **AND** der Aufruf wird mit Zeitstempel in der Konsole geloggt

### Requirement: Bitbucket-Repository-Anlage simulieren
Der Mock SHALL unter `POST /rest/api/1.0/projects/:projectKey/repos` nach 500 ms Verzögerung mit HTTP 201 und einem Repository-Objekt im Bitbucket-Server-Format antworten. Eine Authentifizierung MUST NOT geprüft werden.

#### Scenario: Repository anlegen
- **WHEN** ein Body `{"name": "My Project"}` an `/rest/api/1.0/projects/FMS/repos` gesendet wird
- **THEN** ist `slug` = Name in Kleinbuchstaben mit Folgen nicht-alphanumerischer Zeichen durch `-` ersetzt (`my-project`)
- **AND** `links.clone` enthält einen `http`-Link `http://<host>/scm/fms/my-project.git` und einen `ssh`-Link `ssh://git@<hostname>:7992/fms/my-project.git`
- **AND** die Antwort enthält u. a. `id` (Zufallszahl < 1000), `scmId` = `git`, `state` = `AVAILABLE`, `forkable` = `true`, `project.key` = `FMS`
