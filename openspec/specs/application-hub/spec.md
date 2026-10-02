# application-hub Specification

## Purpose

Der Application Hub zeigt alle in ArgoCD registrierten Applikationen mit Deployment-Zustand an. Er besteht aus der ArgoCD-Integration im Backend (`ArgoCdService`, `ArgoCdConfig`, `ArgoCdProperties`, DTOs unter `dto/argocd`) und der Frontend-Seite `ArgoCdApplications` (Route `/argocd`, per HashRouter erreichbar unter `/#/argocd`).

## Requirements

### Requirement: Abruf der Applikationen aus ArgoCD
Das Backend SHALL die Applikationsliste per `GET {argocd.url}/api/v1/applications` mit dem Header `Authorization: Bearer {argocd.api-key}` abrufen. Unbekannte Felder der ArgoCD-Antwort MUST ignoriert werden (`@JsonIgnoreProperties(ignoreUnknown = true)`).

#### Scenario: ArgoCD antwortet erfolgreich
- **WHEN** ArgoCD eine Liste `{"items":[...]}` liefert
- **THEN** deserialisiert das Backend `metadata` (`name`, `namespace`, `uid`), `spec.project`, `status.health` (`status`, `message`), `status.sync` (`status`, `revision`) und `status.summary.externalURLs`

#### Scenario: ArgoCD antwortet mit HTTP-Fehler
- **WHEN** ArgoCD mit einem Fehlerstatus antwortet (`RestClientResponseException`)
- **THEN** loggt das Backend Status und Antwort-Body
- **AND** wirft eine `ArgoCdIntegrationException` mit der Meldung `Failed to fetch applications from ArgoCD. Status: <status>`

#### Scenario: Sonstiger Kommunikationsfehler
- **WHEN** beim Aufruf eine andere Ausnahme auftritt
- **THEN** wirft das Backend eine `ArgoCdIntegrationException` mit der Meldung `Unexpected error communicating with ArgoCD`

### Requirement: Mapping für das Frontend
Das Backend SHALL jede ArgoCD-Applikation auf `ArgoCdApplicationResponseDto` abbilden und fehlende Werte mit Standardwerten belegen.

#### Scenario: Vollständige Applikationsdaten
- **WHEN** eine Applikation alle Felder enthält
- **THEN** werden `name` = `metadata.name`, `project` = `spec.project`, `syncStatus` = `status.sync.status`, `healthStatus` = `status.health.status`, `externalUrls` = `status.summary.externalURLs` gesetzt

#### Scenario: Fehlende Werte
- **WHEN** `metadata` fehlt
- **THEN** ist `name` = `unknown`
- **WHEN** `spec` oder `spec.project` fehlt
- **THEN** ist `project` = `default`
- **WHEN** `status.sync` bzw. `status.health` fehlt
- **THEN** ist `syncStatus` bzw. `healthStatus` = `Unknown`
- **WHEN** `status.summary.externalURLs` fehlt
- **THEN** ist `externalUrls` eine leere Liste

#### Scenario: Erzeugung des ArgoCD-Links
- **WHEN** eine Applikation abgebildet wird
- **THEN** ist `argocdUrl` = `{argocd.url ohne abschließendes "/"}/applications/{name}`

### Requirement: Darstellung im Frontend
Die Seite `ArgoCdApplications` SHALL die Applikationen nach Projekt gruppiert als Karten mit Name, Sync-Status, Health-Status, ArgoCD-Link und externen Anwendungslinks darstellen. Projektgruppen MUST alphabetisch sortiert und mit Projektname in Großbuchstaben sowie Anzahl der Apps angezeigt werden.

#### Scenario: Statusfarben
- **WHEN** ein Status `Healthy` oder `Synced` ist
- **THEN** wird ein grünes Badge angezeigt
- **WHEN** ein Status `Degraded` oder `OutOfSync` ist
- **THEN** wird ein gelbes Badge angezeigt
- **WHEN** ein Status `Suspended` oder `Missing` ist
- **THEN** wird ein rotes Badge angezeigt
- **WHEN** ein anderer Status vorliegt
- **THEN** wird ein graues Badge angezeigt

#### Scenario: Projektfarbe
- **WHEN** eine Projektgruppe gerendert wird
- **THEN** wird ihre Farbe deterministisch aus einem Hash des Projektnamens aus acht Farbvarianten gewählt

#### Scenario: Externe Anwendungslinks
- **WHEN** eine Applikation `externalUrls` besitzt
- **THEN** werden alle URLs angezeigt, die nicht (case-insensitive) `/api/` enthalten
- **AND** der Linktext ist der erste Hostname-Teil mit großem Anfangsbuchstaben
- **AND** URLs mit `mailpit` im ersten Hostname-Teil oder in der URL werden als `Mailpit` mit Mail-Icon angezeigt

#### Scenario: Links öffnen in neuem Tab
- **WHEN** der Nutzer auf den ArgoCD-Link oder einen externen Link klickt
- **THEN** öffnet sich das Ziel in einem neuen Tab mit `rel="noopener noreferrer"`

### Requirement: Suche
Die Seite SHALL eine Suche bereitstellen, die Applikationen case-insensitive nach Name oder Projekt filtert.

#### Scenario: Filterung
- **WHEN** der Nutzer einen Suchbegriff eingibt
- **THEN** werden nur Applikationen angezeigt, deren `name` oder `project` den Begriff enthält

#### Scenario: Keine Treffer
- **WHEN** nach der Filterung keine Applikation übrig bleibt und kein Fehler vorliegt
- **THEN** wird `Keine Applikationen gefunden.` angezeigt

### Requirement: Favoriten
Die Seite SHALL es erlauben, Applikationen als Favoriten zu markieren. Favoriten MUST im `localStorage` unter dem Schlüssel `kubiverse-favorites` als JSON-Array von Applikationsnamen gespeichert werden.

#### Scenario: Favorit umschalten
- **WHEN** der Nutzer auf das Stern-Symbol einer Applikation klickt
- **THEN** wird der Applikationsname zur Favoritenliste hinzugefügt bzw. daraus entfernt und im `localStorage` gespeichert

#### Scenario: Favoritengruppe
- **WHEN** mindestens eine gefilterte Applikation Favorit ist
- **THEN** erscheint eine zusätzliche Gruppe `Favoriten` (Stern-Symbol, Amber-Farbe) immer an erster Stelle
- **AND** die Applikation bleibt zusätzlich in ihrer Projektgruppe

#### Scenario: Ungültige gespeicherte Favoriten
- **WHEN** der Wert unter `kubiverse-favorites` kein gültiges JSON ist
- **THEN** wird ein Fehler in der Konsole geloggt und die Favoritenliste bleibt leer

### Requirement: Aktualisierung und Ladezustände
Die Seite SHALL die Daten über TanStack React Query (Query-Key `argocd-applications`) laden, alle 30 Sekunden automatisch neu abrufen und eine manuelle Aktualisierung ermöglichen.

#### Scenario: Laden
- **WHEN** die Daten geladen werden
- **THEN** werden sechs Platzhalter-Karten angezeigt und der Aktualisieren-Button ist deaktiviert und animiert

#### Scenario: Manuelles Aktualisieren
- **WHEN** der Nutzer den Aktualisieren-Button klickt
- **THEN** werden die Daten erneut abgerufen

#### Scenario: Fehler beim Laden
- **WHEN** die Backend-Antwort keinen OK-Status hat
- **THEN** wird der Hinweis `Die Applikationen konnten nicht geladen werden. Bitte stellen Sie sicher, dass ArgoCD konfiguriert und erreichbar ist.` angezeigt
