# project-bootstrap Specification

## Purpose

Initialisierung neuer Projekte: Anlegen eines Repositories in Bitbucket Server und Befüllen mit dem Inhalt eines Template-Repositories. Umgesetzt durch `ProjectBootstrapController`, `ProjectBootstrapService` (Bitbucket REST via `RestTemplate`, Git via JGit) und das Formular in Schritt 01 der Komponente `DeploymentGuide` im Frontend.

Konfiguration (`application.yml`, Präfix `bitbucket`): `api-url`, `project`, `template-repo-url`, `token`.

## Requirements

### Requirement: Eingabe im Frontend
Das Frontend SHALL in Schritt 01 ("Neues Projekt in Bitbucket anlegen") ein Eingabefeld für den Projektnamen und einen Button `Projekt initialisieren` anbieten.

#### Scenario: Leerer Projektname
- **WHEN** der Nutzer ohne (bzw. mit nur Leerzeichen als) Projektnamen auf `Projekt initialisieren` klickt
- **THEN** wird kein Request gesendet
- **AND** `Bitte einen Projektnamen eingeben` erscheint als Toast und Inline-Feedback

#### Scenario: Erfolgreiche Initialisierung
- **WHEN** das Backend mit einem OK-Status antwortet
- **THEN** erscheint `Projekt erfolgreich bootstrapped!` als Toast und Inline-Feedback
- **AND** das Eingabefeld wird geleert

#### Scenario: Fehlgeschlagene Initialisierung
- **WHEN** das Backend mit einem Fehlerstatus antwortet
- **THEN** erscheint `Fehler: <error>` als Toast und Inline-Feedback, wobei `<error>` das Feld `error` der Antwort oder `Bootstrap fehlgeschlagen` ist

#### Scenario: Laufende Anfrage
- **WHEN** der Request läuft
- **THEN** ist der Button deaktiviert und zeigt einen Lade-Spinner

### Requirement: Bitbucket-Repository anlegen
Das Backend SHALL per `POST {bitbucket.api-url}/projects/{bitbucket.project}/repos` mit Bearer-Token `{bitbucket.token}` und Body `{"name": <projectName>, "scmId": "git", "forkable": true}` ein neues Repository anlegen.

#### Scenario: Clone-URL aus Antwort
- **WHEN** die Antwort `links.clone` mit einem Eintrag `name` = `http` oder `https` enthält
- **THEN** wird dessen `href` als Clone-URL des neuen Repositories verwendet

#### Scenario: Fallback-Clone-URL
- **WHEN** die Antwort keine `links` bzw. keinen http/https-Clone-Link enthält
- **THEN** wird die Clone-URL als `{template-repo-url bis zum letzten "/"}/{projectName in Kleinbuchstaben}.git` gebildet

#### Scenario: Bitbucket-Aufruf schlägt fehl
- **WHEN** der REST-Aufruf oder die Auswertung der Antwort eine Ausnahme wirft
- **THEN** wirft der Service `RuntimeException("Bitbucket API call failed")` und der Git-Schritt entfällt

### Requirement: Repository mit Template-Inhalt befüllen
Das Backend SHALL nach dem Anlegen das Template-Repository in ein temporäres Verzeichnis (`bootstrap-<projectName>…`) klonen, dessen Git-Historie (`.git`) löschen, ein neues Git-Repository initialisieren, alle Dateien mit der Nachricht `Initial commit from template` committen, den Remote `origin` auf die neue Clone-URL setzen und pushen (`setPushAll`). Für Clone und Push MUST der Credentials-Provider mit Benutzer `x-token-auth` und Passwort `{bitbucket.token}` verwendet werden.

#### Scenario: Template-Clone schlägt fehl
- **WHEN** das Klonen des Templates fehlschlägt
- **THEN** wird eine Warnung geloggt
- **AND** stattdessen eine Datei `README.md` mit Inhalt `# <projectName>\nBootstrapped project.` erzeugt und committet

#### Scenario: Push schlägt fehl
- **WHEN** der Push zum neuen Repository fehlschlägt
- **THEN** wird nur eine Warnung geloggt und der Bootstrap gilt dennoch als erfolgreich

#### Scenario: Aufräumen
- **WHEN** der Git-Schritt endet (erfolgreich oder mit Fehler)
- **THEN** wird das temporäre Verzeichnis rekursiv gelöscht

#### Scenario: Sonstiger Git-Fehler
- **WHEN** im Git-Schritt eine nicht abgefangene Ausnahme auftritt (z. B. bei Init, Commit oder Remote-Konfiguration)
- **THEN** wirft der Service `RuntimeException("Git bootstrap failed")`
