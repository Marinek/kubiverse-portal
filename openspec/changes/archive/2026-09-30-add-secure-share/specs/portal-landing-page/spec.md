# Spec Delta

## MODIFIED Requirements

### Requirement: Routing
Das Frontend SHALL React Router mit `HashRouter` verwenden und die Routen `/` (`Index`), `/argocd` (`ArgoCdApplications`), `/secure-share` (Share erstellen), `/share/:token` und `/share` (Share abrufen) sowie `*` (`NotFound`) bereitstellen.

#### Scenario: Unbekannte Route
- **WHEN** eine nicht definierte Route aufgerufen wird
- **THEN** zeigt die Seite `NotFound` den Text `404` / `Oops! Page not found` mit Link zur Startseite
- **AND** der Pfad wird per `console.error` protokolliert

#### Scenario: Secure-Share-Seite
- **WHEN** die Route `/secure-share` aufgerufen wird
- **THEN** zeigt das Portal die Seite zum Erstellen eines Shares mit Header und Footer

#### Scenario: Freigabelink
- **WHEN** ein Freigabelink der Form `/#/share/<token>` geöffnet wird
- **THEN** zeigt das Portal die Empfängerseite des Shares
- **AND** die Adresszeile zeigt danach nur noch `/#/share` ohne Token
- **AND** der Pfad wird nicht per `console.error` protokolliert

### Requirement: Header-Navigation
Der Header SHALL die Marke `FMS-Kubiverse – DevOps Portal`, Anker-Links zu den Abschnitten `kubiverse`, `deployment` und `documentation`, einen Button `Application Hub` (Link auf `/argocd`), einen Menüpunkt `Secure Share` (Link auf `/secure-share`) und optional einen Button `ArgoCD` anzeigen.

#### Scenario: Anker-Navigation von einer Unterseite
- **WHEN** der Nutzer auf einer anderen Route als `/` einen Anker-Link klickt
- **THEN** navigiert die App zu `/` und scrollt nach 100 ms sanft zum Zielabschnitt

#### Scenario: ArgoCD-Button
- **WHEN** `VITE_ARGOCD_UI_URL` zur Build-Zeit gesetzt ist
- **THEN** zeigt der Header einen Button `ArgoCD`, der die URL in einem neuen Tab öffnet
- **WHEN** `VITE_ARGOCD_UI_URL` nicht gesetzt ist
- **THEN** wird der Button nicht angezeigt

#### Scenario: Menüpunkt Secure Share
- **WHEN** der Nutzer im Header auf `Secure Share` klickt
- **THEN** navigiert die App zur Route `/secure-share`
- **AND** der Menüpunkt ist auf allen Bildschirmgrößen sichtbar
