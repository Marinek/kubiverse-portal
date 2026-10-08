# mock-server Specification

## Purpose

Der Mock (`mock/server.js`, Express 5) simuliert die vom Backend genutzten Endpunkte von ArgoCD, damit das System ohne echten ArgoCD-Cluster lauffähig ist. Er lauscht auf `PORT` (Standard `12004`), aktiviert CORS für alle Ursprünge und parst JSON-Bodies.

## Requirements

### Requirement: ArgoCD-Applikationsliste simulieren
Der Mock SHALL unter `GET /api/v1/applications` nach 500 ms Verzögerung eine statische Liste `{"items":[...]}` mit sechs Applikationen im ArgoCD-Format liefern.

#### Scenario: Abruf der Mock-Applikationen
- **WHEN** `GET /api/v1/applications` aufgerufen wird
- **THEN** enthält die Antwort die Applikationen `kubiverse-frontend`, `kubiverse-backend` (Projekt `kubiverse`), `payment-service`, `billing-ui` (Projekt `finance`), `legacy-app`, `mail-server` (Projekt `default`)
- **AND** jede Applikation enthält `metadata`, `spec.project`, `status.health`, `status.sync` und `status.summary.externalURLs`
- **AND** der Aufruf wird mit Zeitstempel in der Konsole geloggt
