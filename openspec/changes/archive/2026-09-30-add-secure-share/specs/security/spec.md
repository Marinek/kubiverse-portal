# Spec Delta

## MODIFIED Requirements

### Requirement: HTTP-Sicherheitsheader im Portal
nginx SHALL `server_tokens off` setzen und für alle Antworten – einschließlich `/index.html`, statischer Assets und des SPA-Fallbacks – die Header `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` sowie eine `Content-Security-Policy` setzen. Die Content-Security-Policy MUST Skripte ausschließlich vom eigenen Ursprung zulassen, Verbindungen (`connect-src`) auf den eigenen Ursprung beschränken, `object-src 'none'` setzen und Einbettung nur durch den eigenen Ursprung erlauben.

#### Scenario: Auslieferung über SPA-Fallback
- **WHEN** eine Route über `location /` ausgeliefert wird
- **THEN** enthält die Antwort die Sicherheitsheader einschließlich `Content-Security-Policy`
- **AND** die nginx-Version wird nicht preisgegeben

#### Scenario: Auslieferung von index.html und Assets
- **WHEN** `/index.html` oder ein statisches Asset ausgeliefert wird
- **THEN** enthält die Antwort neben den Cache-Headern alle Sicherheitsheader

#### Scenario: Fremdes Skript
- **WHEN** eine Seite versucht, ein Skript von einem fremden Ursprung oder ein Inline-Skript auszuführen
- **THEN** blockiert der Browser die Ausführung

#### Scenario: Bestehende externe Ressourcen
- **WHEN** das Portal Web-Fonts von Google Fonts und das ArgoCD-Logo lädt
- **THEN** werden diese durch die Content-Security-Policy nicht blockiert

### Requirement: Clientseitige Datenhaltung
Das Frontend SHALL ausschließlich Favoriten (Applikationsnamen) im `localStorage` speichern und keine Zugangsdaten, Tokens, Freigabelinks, Share-Passwörter oder Share-Inhalte clientseitig dauerhaft ablegen.

#### Scenario: Gespeicherte Daten
- **WHEN** der Nutzer Favoriten setzt
- **THEN** enthält `localStorage` nur den Schlüssel `kubiverse-favorites` mit einem JSON-Array von Namen

#### Scenario: Nutzung von Secure Share
- **WHEN** der Nutzer einen Share erstellt oder abruft
- **THEN** werden weder Freigabelink, Zugriffsgeheimnis, Passwort noch Inhalt in `localStorage` oder `sessionStorage` gespeichert

## ADDED Requirements

### Requirement: Schutz der Secure-Share-Endpunkte vor Cross-Site-Anfragen
Das Backend SHALL Anfragen an Secure-Share-Endpunkte nur mit dem Header `X-Kubiverse-Client: portal` verarbeiten. Dadurch lösen browserseitige Cross-Origin-Anfragen einen CORS-Preflight aus, den das Backend nicht freigibt.

#### Scenario: Formular-Post von fremder Website
- **WHEN** eine fremde Website den Browser eines Nutzers veranlasst, eine Anfrage an `/kubiverse/api/shares` zu senden
- **THEN** wird kein Share erstellt und kein Inhalt ausgeliefert

### Requirement: Ermittlung der Client-IP-Adresse
Das Backend SHALL die Client-IP-Adresse für Anfragebegrenzung und Audit-Logs aus Weiterleitungs-Headern nur dann übernehmen, wenn die Anfrage von einer als vertrauenswürdig konfigurierten Proxy-Adresse stammt; andernfalls MUST die Adresse der direkten Gegenstelle verwendet werden.

#### Scenario: Gefälschter Weiterleitungs-Header
- **WHEN** ein Client von einer nicht vertrauenswürdigen Adresse einen `X-Forwarded-For`-Header mitsendet
- **THEN** ignoriert das Backend diesen Header für Anfragebegrenzung und Audit-Logs

### Requirement: Log-Hygiene
Das Backend SHALL sicherstellen, dass keine Log-Ausgabe – einschließlich Fehler- und Stacktrace-Ausgaben – Share-Inhalte, Dateinamen, Passwörter, Zugriffsgeheimnisse oder Schlüsselmaterial enthält.

#### Scenario: Fehler bei der Verarbeitung
- **WHEN** beim Erstellen oder Abrufen eines Shares eine Ausnahme auftritt und protokolliert wird
- **THEN** enthält der Log-Eintrag keine vertraulichen Share-Daten
