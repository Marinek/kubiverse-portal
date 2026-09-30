# Proposal

## Why

Im FMS-Kubiverse-Umfeld werden regelmäßig vertrauliche Informationen wie Zugangsdaten, Tokens, Konfigurationsdateien oder Zertifikate zwischen Teammitgliedern ausgetauscht. Heute geschieht das über E-Mail, Chat oder Dateiablagen – Kanäle, in denen die Inhalte unverschlüsselt und dauerhaft liegen bleiben. Ein im Portal integriertes „Secure Share“ bietet einen sicheren, zeitlich und in der Anzahl der Abrufe begrenzten Austauschweg dort, wo die Nutzer ohnehin arbeiten.

## What Changes

**Funktion**
- Neuer Bereich **„Secure Share“** im Kubiverse Portal, erreichbar über einen eigenen Menüpunkt in der Header-Navigation.
- Benutzer können **Text-Secrets** (bis 10 000 Zeichen) oder **Dateien** (bis **10 MB**, beliebiger Typ) teilen. Ein Share enthält genau einen dieser Inhalte.
- Beim Teilen wählt der Benutzer eine **Ablaufzeit**: 1 Stunde, 24 Stunden (Standard), 3 Tage oder 7 Tage. Mehr als **7 Tage** sind nicht möglich.
- Beim Teilen legt der Benutzer fest, **wie oft** der Share abgerufen werden darf: von einmal bis unbegrenzt (bis zum Ablauf). Standard ist **einmal („burn after read“)**.
- Optional kann ein **Zusatzpasswort** vergeben werden, das der Empfänger eingeben muss.
- Der Ersteller erhält einen **Freigabelink**, der nur einmal angezeigt wird.

**Download-Ablauf**
- Beim Öffnen des Links sieht der Empfänger zunächst nur, *dass* etwas geteilt wurde (Text oder Datei), ob ein Passwort nötig ist, wann der Share abläuft und wie viele Abrufe verbleiben.
- Erst eine bewusste Aktion („Anzeigen“ bzw. „Herunterladen“) liefert den Inhalt aus und zählt als Abruf. Automatische Link-Vorschauen in Chat- oder Mail-Programmen verbrauchen den Share daher nicht.
- Dateien werden immer als Download ausgeliefert, nie im Browser geöffnet.

**Sicherheit und Datenschutz**
- Inhalte und Dateinamen werden ausschließlich **verschlüsselt gespeichert**. Links und Passwörter werden nicht lesbar abgelegt.
- Nach Ablauf, nach dem letzten erlaubten Abruf oder nach 5 falschen Passworteingaben werden Inhalte **automatisch und endgültig gelöscht**.
- Unbekannte, abgelaufene und bereits abgerufene Shares sind von außen nicht unterscheidbar.
- Das Geheimnis im Link gelangt nicht in Server-Protokolle und wird nach dem Öffnen aus der Adresszeile entfernt.
- Die Sicherheitsheader des Portals werden vervollständigt und um eine Content-Security-Policy ergänzt, da das Portal künftig vertrauliche Inhalte anzeigt.

**Missbrauchsschutz**
- Die Anzahl der Erstellungen und Abrufversuche wird pro Absenderadresse begrenzt.
- Die Gesamtzahl aktiver Shares und die gesamte Speichermenge sind begrenzt. Alle Grenzwerte sind konfigurierbar.

**Fehlerbehandlung**
- Für jeden Fehlerfall zeigt das Portal eine verständliche Meldung auf Deutsch an: zu große Datei, ungültige Eingabe, falsches Passwort, nicht verfügbarer Share, zu viele Anfragen, Dienst ausgelastet oder nicht erreichbar. Technische Details werden nicht angezeigt; Eingaben bleiben bei behebbaren Fehlern erhalten.

**Audit Logging**
- Sicherheitsrelevante Ereignisse werden nachvollziehbar protokolliert: Erstellung, Abruf, falsches Passwort, Löschung mit Grund, Aufruf nicht verfügbarer Shares, ausgelöste Begrenzungen. Inhalte, Dateinamen, Passwörter und Links erscheinen dabei nie in den Protokollen.

**Getroffene Produktentscheidungen**
- Shares erstellen darf jeder, der das Portal erreicht (Betrieb nur im internen Netz). Eine Anmeldung ist nicht erforderlich.
- Empfänger greifen über den Link ohne Anmeldung zu; der Link selbst ist das Geheimnis.
- Die Verschlüsselung erfolgt serverseitig.

**Nicht Teil dieses Changes**
- Anmeldung bzw. Benutzerverwaltung, vorzeitiges Löschen durch den Ersteller, Virenprüfung von Dateien, mehrere Dateien pro Share, Benachrichtigungen.

## Capabilities

### New Capabilities
- `secure-share`: Sicheres, zeitlich und in der Abrufzahl begrenztes Teilen von Text-Secrets und Dateien. Umfasst Erstellung, Größenlimits, Ablaufzeit (höchstens 7 Tage), Abrufanzahl, Passwortschutz, Download-Ablauf, verschlüsselte Speicherung, automatische Löschung, Missbrauchsschutz, Fehlerbehandlung und Audit Logging.

### Modified Capabilities
- `portal-landing-page`: Menüpunkt „Secure Share“ in der Header-Navigation und neue Routen zum Erstellen und Abrufen von Shares.
- `backend-api`: Neue öffentliche Endpunkte zum Erstellen, Prüfen und Abrufen von Shares.
- `deployment`: Dauerhafte Datenablage, Konfiguration von Schlüsseln und Grenzwerten sowie Uploads bis 10 MB über den Reverse Proxy.
- `security`: Vollständige Sicherheitsheader einschließlich Content-Security-Policy, Schutz vor Cross-Site-Anfragen, vertrauenswürdige Ermittlung der Absenderadresse, Log-Hygiene und Regeln zur clientseitigen Datenhaltung.

## Impact

- **Nutzen:** Ein zentraler, nachvollziehbarer und sicherer Austauschweg für vertrauliche Inhalte. Weniger Klartext-Secrets in E-Mail und Chat. Die Speicherdauer ist begrenzt, weil Inhalte automatisch gelöscht werden. Durch das Audit Logging lässt sich im Nachhinein prüfen, wann welche Shares erstellt, abgerufen und gelöscht wurden.
- **Portal (Frontend):** Neuer Menüpunkt, neue Seiten zum Erstellen und Abrufen, verschärfte Sicherheitsheader für das gesamte Portal.
- **Server (Backend):** Neue fachliche Funktion mit Speicherung, Verschlüsselung, Ablaufsteuerung, Missbrauchsschutz und Audit Logging. Das Backend verwaltet damit erstmals dauerhaft Nutzerdaten.
- **Betrieb/Deployment:** Das System braucht nun eine Datenbank, einen sicher verwalteten Verschlüsselungsschlüssel und Speicher für bis zu 1 GB Inhalte (Standard). Ohne Datenbank bleibt das Portal nutzbar, Secure Share meldet sich dann als nicht verfügbar.
- **Sicherheit:** Das Feature verarbeitet besonders schutzbedürftige Daten. Weil keine Anmeldung vorgesehen ist, stützt sich der Schutz auf geheime Links, Begrenzungen, kurze Speicherdauer und Protokollierung. Die Audit-Protokolle enthalten Absenderadressen; ihre Aufbewahrung regelt der Betrieb.
- **Mock:** Keine Auswirkung.
