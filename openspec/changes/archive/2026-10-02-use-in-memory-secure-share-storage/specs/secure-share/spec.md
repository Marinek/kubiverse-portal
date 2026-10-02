# Spec Delta

## MODIFIED Requirements

### Requirement: Verschlüsselte Speicherung
Das System SHALL Inhalte von Text-Secrets, Dateiinhalte und Dateinamen ausschließlich verschlüsselt im flüchtigen Arbeitsspeicher des Backendprozesses halten. Das System MUST NOT Secure-Share-Inhalte, Metadaten, Token-Hashes oder Passwort-Hashes in einer Datenbank, Datei oder einem persistenten Volume speichern. Das Zugriffsgeheimnis aus dem Link und Passwörter MUST NOT im Klartext oder in umkehrbarer Form gespeichert werden.

#### Scenario: Einsicht in den Datenspeicher
- **WHEN** jemand den flüchtigen Datenspeicher ohne den Verschlüsselungsschlüssel des Servers einsieht
- **THEN** kann er weder Text-Secrets noch Dateiinhalte, Dateinamen, Zugriffsgeheimnisse oder Passwörter lesen

#### Scenario: Fehlender Schlüssel
- **WHEN** das Backend ohne gültigen Verschlüsselungsschlüssel gestartet wird
- **THEN** nimmt Secure Share keine neuen Inhalte an

### Requirement: Automatische Löschung
Das System SHALL Shares nach Ablauf automatisch aus dem aktiven Arbeitsspeicher entfernen. Die Entfernung MUST spätestens 5 Minuten nach dem Ablaufzeitpunkt erfolgen. Shares, deren letzter erlaubter Abruf erfolgt ist oder deren Passwort-Fehlversuche das Limit erreicht haben, MUST unmittelbar aus dem aktiven Speicher entfernt und nicht mehr abrufbar sein.

#### Scenario: Löschung nach Ablauf
- **WHEN** der Ablaufzeitpunkt eines Shares mehr als 5 Minuten zurückliegt
- **THEN** ist der Share nicht mehr im aktiven Speicher verfügbar und kann nicht abgerufen werden

#### Scenario: Löschung nach letztem Abruf
- **WHEN** der letzte erlaubte Abruf erfolgt ist
- **THEN** ist der Share unmittelbar nicht mehr abrufbar

### Requirement: Missbrauchsschutz
Das System SHALL die Nutzung pro Client-IP-Adresse begrenzen und globale Kapazitätsgrenzen pro Backendprozess durchsetzen. Die Grenzwerte MUST konfigurierbar sein und haben folgende Standardwerte: höchstens 20 Share-Erstellungen pro Stunde und IP-Adresse, höchstens 60 Aufrufe (Link öffnen und Abrufen zusammen) pro Stunde und IP-Adresse, insgesamt höchstens 1 000 aktive Shares und höchstens 256 MiB gespeicherte Inhalte.

#### Scenario: Zu viele Erstellungen
- **WHEN** eine IP-Adresse das Erstellungslimit überschreitet
- **THEN** lehnt das System weitere Erstellungen mit HTTP 429 und einer Angabe ab, wann es erneut möglich ist

#### Scenario: Zu viele Abrufversuche
- **WHEN** eine IP-Adresse das Abruflimit überschreitet
- **THEN** lehnt das System weitere Aufrufe mit HTTP 429 und einer Angabe ab, wann es erneut möglich ist

#### Scenario: Kapazität erschöpft
- **WHEN** die maximale Anzahl aktiver Shares oder die maximale Speichermenge im Backendprozess erreicht ist
- **THEN** lehnt das System neue Shares mit HTTP 503 ab
- **AND** das Portal meldet, dass Secure Share vorübergehend ausgelastet ist

## ADDED Requirements

### Requirement: Flüchtige Speicherung ohne Datenbank
Das System SHALL Secure Share im Standardbetrieb ohne PostgreSQL bereitstellen. Verschlüsselte Shares und zugehörige Metadaten MUST ausschließlich während der Laufzeit des Backendprozesses verfügbar sein. Beim Beenden oder Neustarten des Backendprozesses MUST das System alle zuvor erstellten Shares verwerfen.

#### Scenario: Share im laufenden Backend abrufen
- **WHEN** ein Share erstellt und vor dem Ende des Backendprozesses abgerufen wird
- **THEN** stehen Inhalt, Metadaten, Ablaufzeit und Abrufzähler wie spezifiziert zur Verfügung

#### Scenario: Share nach Backend-Neustart
- **WHEN** ein Share erstellt und danach der Backendprozess beendet oder neu gestartet wird
- **THEN** ist der Share nicht mehr verfügbar und Abrufversuche liefern dieselbe HTTP-404-Antwort wie für einen unbekannten Share

## REMOVED Requirements

### Requirement: Nicht verfügbarer Betrieb ohne Datenspeicher
Das System SHALL Secure Share als nicht verfügbar melden, wenn das Backend ohne Datenspeicher betrieben wird. Die übrigen Funktionen des Portals MUST davon unberührt bleiben.

#### Scenario: Betrieb im Profil no-db
- **WHEN** das Backend im Profil `no-db` läuft und ein Share erstellt oder abgerufen werden soll
- **THEN** antwortet das System mit HTTP 503
- **AND** der Application Hub und der Projekt-Bootstrap funktionieren weiterhin

**Reason**: Der Backendprozess stellt künftig selbst einen flüchtigen Datenspeicher bereit; PostgreSQL ist keine Voraussetzung für Secure Share.
**Migration**: Das Profil `no-db` und der 503-Fallback entfallen. Shares sind nur innerhalb der Laufzeit eines Backendprozesses verfügbar.