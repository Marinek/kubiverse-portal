# secure-share Specification

## Purpose

Ermöglicht Benutzern des Kubiverse Portals, Text-Secrets und Dateien über einen zeitlich und in der Anzahl der Abrufe begrenzten Link sicher zu teilen. Die Inhalte werden verschlüsselt gespeichert und automatisch gelöscht.

## Requirements

### Requirement: Share erstellen
Das System SHALL es jedem Benutzer, der das Portal erreicht, erlauben, einen Share ohne Anmeldung zu erstellen. Ein Share MUST genau einen Inhalt enthalten: entweder ein Text-Secret oder eine Datei. Nach erfolgreicher Erstellung MUST das System einen Freigabelink, den Ablaufzeitpunkt und die gewählte Anzahl erlaubter Abrufe anzeigen.

#### Scenario: Text-Secret teilen
- **WHEN** ein Benutzer ein nicht-leeres Text-Secret eingibt und den Share erstellt
- **THEN** zeigt das System einen Freigabelink, den Ablaufzeitpunkt und die Anzahl erlaubter Abrufe an
- **AND** bietet an, den Link in die Zwischenablage zu kopieren

#### Scenario: Datei teilen
- **WHEN** ein Benutzer eine nicht-leere Datei auswählt und den Share erstellt
- **THEN** zeigt das System einen Freigabelink, den Ablaufzeitpunkt und die Anzahl erlaubter Abrufe an

#### Scenario: Link wird nur einmal angezeigt
- **WHEN** der Benutzer die Ergebnisansicht verlässt
- **THEN** kann der Freigabelink nicht erneut angezeigt oder wiederhergestellt werden

#### Scenario: Text und Datei gleichzeitig
- **WHEN** ein Share gleichzeitig ein Text-Secret und eine Datei enthalten soll
- **THEN** lehnt das System die Erstellung mit einem Validierungsfehler ab

### Requirement: Größenbeschränkungen
Das System SHALL Dateien bis einschließlich 10 MB (10 485 760 Byte) und Text-Secrets bis einschließlich 10 000 Zeichen akzeptieren. Leere Dateien und leere Text-Secrets MUST abgelehnt werden. Es gibt keine Einschränkung der Dateitypen.

#### Scenario: Datei zu groß (clientseitig)
- **WHEN** ein Benutzer eine Datei größer als 10 MB auswählt
- **THEN** weist das Portal vor dem Hochladen darauf hin, dass die maximale Dateigröße 10 MB beträgt
- **AND** es wird kein Upload gestartet

#### Scenario: Datei zu groß (serverseitig)
- **WHEN** eine Datei größer als 10 MB an das Backend übertragen wird
- **THEN** lehnt das System die Anfrage mit HTTP 413 ab und speichert nichts

#### Scenario: Text zu lang
- **WHEN** ein Text-Secret mehr als 10 000 Zeichen enthält
- **THEN** lehnt das System die Erstellung mit einem Validierungsfehler ab

#### Scenario: Leerer Inhalt
- **WHEN** ein leeres Text-Secret oder eine Datei mit 0 Byte geteilt werden soll
- **THEN** lehnt das System die Erstellung mit einem Validierungsfehler ab

### Requirement: Ablaufzeit
Das System SHALL beim Erstellen die Auswahl einer Ablaufzeit aus den festen Stufen 1 Stunde, 24 Stunden, 3 Tage und 7 Tage anbieten. Standard ist 24 Stunden. Andere Werte, insbesondere mehr als 7 Tage, MUST abgelehnt werden.

#### Scenario: Standard-Ablaufzeit
- **WHEN** der Benutzer keine Ablaufzeit ändert
- **THEN** läuft der Share 24 Stunden nach der Erstellung ab

#### Scenario: Ungültige Ablaufzeit
- **WHEN** eine Ablaufzeit außerhalb der erlaubten Stufen angefragt wird
- **THEN** lehnt das System die Erstellung mit einem Validierungsfehler ab

#### Scenario: Abgelaufener Share
- **WHEN** ein Empfänger einen Share nach dessen Ablaufzeitpunkt aufruft
- **THEN** ist der Inhalt nicht mehr abrufbar, auch wenn die automatische Löschung noch nicht stattgefunden hat

### Requirement: Anzahl erlaubter Abrufe
Das System SHALL beim Erstellen die Festlegung der maximalen Anzahl von Abrufen erlauben: eine ganze Zahl von 1 bis 100 oder „unbegrenzt“ (bis zum Ablauf). Standard ist 1 („burn after read“).

#### Scenario: Burn after read
- **WHEN** ein Share mit der Standardeinstellung erstellt wurde und einmal erfolgreich abgerufen wird
- **THEN** wird der Share unmittelbar gelöscht
- **AND** jeder weitere Aufruf des Links meldet, dass der Share nicht verfügbar ist

#### Scenario: Mehrfacher Abruf
- **WHEN** ein Share mit maximal 3 Abrufen erstellt wurde
- **THEN** ist er genau dreimal erfolgreich abrufbar und wird nach dem dritten Abruf gelöscht

#### Scenario: Unbegrenzte Abrufe
- **WHEN** ein Share mit „unbegrenzt“ erstellt wurde
- **THEN** ist er bis zum Ablaufzeitpunkt beliebig oft abrufbar

#### Scenario: Gleichzeitige Abrufe
- **WHEN** mehrere Empfänger einen Share mit einem verbleibenden Abruf gleichzeitig abrufen
- **THEN** erhält höchstens einer den Inhalt

### Requirement: Optionaler Passwortschutz
Das System SHALL beim Erstellen ein optionales Zusatzpasswort mit 8 bis 128 Zeichen erlauben. Ein passwortgeschützter Share MUST nur nach Eingabe des korrekten Passworts ausgeliefert werden. Nach 5 aufeinanderfolgenden Fehleingaben MUST der Share gelöscht werden.

#### Scenario: Korrektes Passwort
- **WHEN** der Empfänger das korrekte Passwort eingibt
- **THEN** wird der Inhalt ausgeliefert und der Fehlversuchszähler zurückgesetzt

#### Scenario: Falsches Passwort
- **WHEN** der Empfänger ein falsches Passwort eingibt
- **THEN** wird der Inhalt nicht ausgeliefert, und der Abruf zählt nicht als Download
- **AND** das Portal weist darauf hin, dass der Share nach 5 Fehlversuchen gelöscht wird

#### Scenario: Zu viele Fehlversuche
- **WHEN** zum fünften Mal in Folge ein falsches Passwort eingegeben wird
- **THEN** wird der Share gelöscht

#### Scenario: Ungültige Passwortlänge
- **WHEN** beim Erstellen ein Passwort mit weniger als 8 oder mehr als 128 Zeichen angegeben wird
- **THEN** lehnt das System die Erstellung mit einem Validierungsfehler ab

### Requirement: Download-Ablauf für Empfänger
Das System SHALL den Abruf in zwei Schritten durchführen: Beim Öffnen des Links wird nur angezeigt, dass ein Text-Secret oder eine Datei geteilt wurde, ob ein Passwort erforderlich ist, wann der Share abläuft und wie viele Abrufe verbleiben. Erst eine ausdrückliche Aktion des Empfängers MUST den Inhalt ausliefern und als Abruf zählen.

#### Scenario: Link öffnen
- **WHEN** ein Empfänger den Freigabelink öffnet
- **THEN** zeigt das Portal Typ, Passwortpflicht, Ablaufzeitpunkt und verbleibende Abrufe an
- **AND** der Abrufzähler wird nicht verändert

#### Scenario: Link-Vorschau durch Chat- oder Mail-Programme
- **WHEN** ein Programm den Link automatisch aufruft, ohne dass eine Aktion auf der Seite ausgelöst wird
- **THEN** wird kein Abruf gezählt und kein Inhalt ausgeliefert

#### Scenario: Text-Secret anzeigen
- **WHEN** der Empfänger bei einem Text-Secret „Anzeigen“ wählt (ggf. mit Passwort)
- **THEN** zeigt das Portal den Text an und bietet an, ihn in die Zwischenablage zu kopieren
- **AND** weist darauf hin, falls der Share damit gelöscht wurde

#### Scenario: Datei herunterladen
- **WHEN** der Empfänger bei einer Datei „Herunterladen“ wählt (ggf. mit Passwort)
- **THEN** lädt der Browser die Datei unter ihrem ursprünglichen Dateinamen herunter
- **AND** die Datei wird als Download ausgeliefert und nicht im Browser geöffnet oder ausgeführt

#### Scenario: Link aus der Adresszeile entfernen
- **WHEN** die Empfängerseite geladen wurde
- **THEN** ist das Zugriffsgeheimnis nicht mehr in der Adresszeile sichtbar

### Requirement: Einheitliche Antwort bei nicht verfügbaren Shares
Das System SHALL für unbekannte, abgelaufene, vollständig abgerufene und gelöschte Shares dieselbe Antwort liefern, sodass diese Fälle von außen nicht unterscheidbar sind.

#### Scenario: Nicht verfügbarer Share
- **WHEN** ein Empfänger einen Link zu einem unbekannten, abgelaufenen, verbrauchten oder gelöschten Share öffnet
- **THEN** zeigt das Portal die Meldung, dass der Share nicht existiert oder nicht mehr verfügbar ist
- **AND** es werden keine Informationen über den früheren Inhalt preisgegeben

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

### Requirement: Unkenntlichkeit des Zugriffsgeheimnisses
Das System SHALL jeden Share über ein zufälliges Zugriffsgeheimnis mit mindestens 256 Bit Entropie adressieren. Das Zugriffsgeheimnis MUST NOT in Server- oder Proxy-Zugriffsprotokollen, in Audit-Logs, in Referrer-Headern oder im Browser-Speicher (`localStorage`, `sessionStorage`) landen.

#### Scenario: Aufruf des Links
- **WHEN** ein Empfänger den Freigabelink öffnet und den Inhalt abruft
- **THEN** wird das Zugriffsgeheimnis nicht als Teil einer an den Server gesendeten URL übertragen

#### Scenario: Erraten von Links
- **WHEN** jemand versucht, gültige Links durch Ausprobieren zu finden
- **THEN** ist dies wegen der Entropie des Zugriffsgeheimnisses und der Anfragebegrenzung praktisch aussichtslos

### Requirement: Keine Zwischenspeicherung von Inhalten
Das System SHALL alle Antworten, die Inhalte oder Metadaten von Shares enthalten, als nicht zwischenspeicherbar kennzeichnen.

#### Scenario: Browser- und Proxy-Cache
- **WHEN** ein Inhalt ausgeliefert wurde
- **THEN** ist er weder im Browser-Cache noch in zwischengeschalteten Caches abrufbar

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

### Requirement: Fehlerbehandlung im Portal
Das Portal SHALL für jeden Fehlerfall eine verständliche deutschsprachige Meldung anzeigen und MUST NOT technische Details oder Inhalte anderer Shares preisgeben. Eingaben des Benutzers MUST bei behebbaren Fehlern erhalten bleiben.

#### Scenario: Validierungsfehler
- **WHEN** das Backend eine Erstellung wegen ungültiger Eingaben ablehnt
- **THEN** nennt das Portal das betroffene Eingabefeld und die Regel (z. B. Größe, Länge, Ablaufzeit)
- **AND** die übrigen Eingaben bleiben erhalten

#### Scenario: Antwort ohne verwertbaren Fehlertext
- **WHEN** eine Fehlerantwort keinen auswertbaren Inhalt hat (z. B. vom Reverse Proxy)
- **THEN** leitet das Portal die Meldung aus dem HTTP-Status ab

#### Scenario: Netzwerkfehler
- **WHEN** das Backend nicht erreichbar ist
- **THEN** meldet das Portal, dass Secure Share derzeit nicht erreichbar ist, und bietet einen erneuten Versuch an

#### Scenario: Unerwarteter Fehler
- **WHEN** das Backend mit HTTP 500 antwortet
- **THEN** zeigt das Portal eine allgemeine Fehlermeldung ohne technische Details

### Requirement: Audit Logging
Das System SHALL sicherheitsrelevante Ereignisse als strukturierte Audit-Einträge protokollieren. Jeder Eintrag MUST Zeitpunkt, Ereignistyp, Client-IP-Adresse und – sofern vorhanden – eine interne Share-Kennung enthalten. Audit-Einträge MUST NOT Inhalte, Dateinamen, Passwörter, Zugriffsgeheimnisse oder Schlüssel enthalten.

Protokollierte Ereignisse: Share erstellt (mit Typ, Größe, Ablaufzeitpunkt, maximalen Abrufen, Passwortschutz ja/nein), Share abgerufen (mit verbleibenden Abrufen), Passwort falsch (mit Anzahl der Fehlversuche), Share gelöscht (mit Grund: abgelaufen, alle Abrufe verbraucht, zu viele Passwort-Fehlversuche), Aufruf eines nicht verfügbaren Shares, Anfragebegrenzung ausgelöst, Kapazitätsgrenze erreicht.

#### Scenario: Erstellung wird protokolliert
- **WHEN** ein Share erstellt wird
- **THEN** entsteht ein Audit-Eintrag „Share erstellt“ mit interner Kennung, Typ, Größe, Ablaufzeitpunkt, maximalen Abrufen, Passwortschutz und Client-IP

#### Scenario: Löschung wird protokolliert
- **WHEN** ein Share wegen Ablauf, verbrauchter Abrufe oder zu vieler Passwort-Fehlversuche gelöscht wird
- **THEN** entsteht ein Audit-Eintrag „Share gelöscht“ mit interner Kennung und Löschgrund

#### Scenario: Keine vertraulichen Daten im Log
- **WHEN** ein beliebiges Secure-Share-Ereignis protokolliert wird
- **THEN** enthält weder der Audit-Eintrag noch ein anderer Log-Eintrag Inhalt, Dateiname, Passwort, Zugriffsgeheimnis oder Schlüssel

### Requirement: Flüchtige Speicherung ohne Datenbank
Das System SHALL Secure Share im Standardbetrieb ohne PostgreSQL bereitstellen. Verschlüsselte Shares und zugehörige Metadaten MUST ausschließlich während der Laufzeit des Backendprozesses verfügbar sein. Beim Beenden oder Neustarten des Backendprozesses MUST das System alle zuvor erstellten Shares verwerfen.

#### Scenario: Share im laufenden Backend abrufen
- **WHEN** ein Share erstellt und vor dem Ende des Backendprozesses abgerufen wird
- **THEN** stehen Inhalt, Metadaten, Ablaufzeit und Abrufzähler wie spezifiziert zur Verfügung

#### Scenario: Share nach Backend-Neustart
- **WHEN** ein Share erstellt und danach der Backendprozess beendet oder neu gestartet wird
- **THEN** ist der Share nicht mehr verfügbar und Abrufversuche liefern dieselbe HTTP-404-Antwort wie für einen unbekannten Share
