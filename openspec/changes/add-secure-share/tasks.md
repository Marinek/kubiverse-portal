# Tasks

Backend-Befehle laufen ohne lokal installiertes Gradle über Docker:
`docker run --rm -v "$PWD/server":/app -w /app gradle:9-jdk21-alpine gradle test --no-daemon`

## 1. Backend-Grundlagen und Konfiguration

- [ ] 1.1 `application.yml` erweitern: Datasource auf `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` mit bisherigen Werten als Standard, Multipart-Limits (`max-file-size=10MB`, `max-request-size=11MB`), `server.forward-headers-strategy=native`, `server.tomcat.remoteip.internal-proxies` aus `SECURE_SHARE_TRUSTED_PROXIES`, Block `secure-share.*` (Schlüssel ohne Standardwert, Rate-Limits, Kapazität); prüfen: bestehender `contextLoads`-Test (Profil `no-db`) läuft grün
- [ ] 1.2 `SecureShareProperties` (`@ConfigurationProperties("secure-share")`, validiert) und `@EnableScheduling` anlegen; prüfen: Unit-Test bindet Standardwerte (20/h, 60/h, 1000 Shares, 1 GB) und Overrides korrekt
- [ ] 1.3 H2 als `testImplementation` und `src/test/resources/application-test.yml` (Profil mit Datenbank, Test-Master-Schlüssel) ergänzen; prüfen: `gradle test` startet einen Kontext im Testprofil erfolgreich

## 2. Verschlüsselung und Zugriffsgeheimnis

- [ ] 2.1 `ShareCryptoService` implementieren: DEK pro Share, AES-256-GCM mit 96-Bit-IV, DEK-Wrapping mit KEK, Share-`id` als AAD, `key_id`, optionaler vorheriger Schlüssel, Fail-fast bei fehlendem/ungültigem Schlüssel ohne Wert in der Meldung; prüfen: Unit-Tests für Roundtrip, vertauschte AAD schlägt fehl, Entschlüsselung mit vorherigem Schlüssel, ungültige Schlüssellänge
- [ ] 2.2 Token-Erzeugung (32 Byte `SecureRandom`, Base64url ohne Padding) und `SHA-256`-Hash implementieren; prüfen: Unit-Test auf 43 Zeichen, URL-sicheres Alphabet, Eindeutigkeit über 10 000 Tokens, deterministischer Hash

## 3. Persistenz

- [ ] 3.1 Entität `SecureShare` und `SecureShareRepository` (`@Profile("!no-db")`) gemäß Schema in design.md D1 anlegen, inkl. Lookup per `token_hash` mit `PESSIMISTIC_WRITE`, Abfrage abgelaufener IDs, `count`/`sum(size_bytes)` aktiver Shares; prüfen: `@DataJpaTest` für Speichern, Lookup, Sperr-Query und Aggregat-Abfragen

## 4. Audit Logging und Missbrauchsschutz

- [ ] 4.1 `AuditLogger` (Logger `AUDIT`, typisierte Methoden je Ereignis aus design.md D11, Key-Value-Format) implementieren; prüfen: Test mit `OutputCaptureExtension` auf Format und Felder
- [ ] 4.2 In-Memory-`RateLimiter` (Fixed Window je Client-IP und Aktion `create`/`access`, Retry-After in Sekunden, periodisches Aufräumen) implementieren; prüfen: Unit-Tests für Limit-Erreichen, Fensterwechsel, Trennung der Aktionen und IPs
- [ ] 4.3 Filter für `/kubiverse/api/shares/**` implementieren, der `X-Kubiverse-Client: portal` verlangt und `Cache-Control: no-store` setzt; prüfen: MockMvc-Test liefert 400 ohne Header und `no-store` auf allen Share-Antworten

## 5. Service-Logik

- [ ] 5.1 Erstellen implementieren: genau ein Inhalt, Datei 1 Byte–10 485 760 Byte, Text 1–10 000 Zeichen, `expiresIn` ∈ {1h, 24h, 3d, 7d} (Standard 24h), `maxDownloads` 1–100 oder `unlimited` (Standard 1), Passwort 8–128 Zeichen mit BCrypt, Kapazitätsprüfung, Verschlüsselung, Rate-Limit `create`, Audit `SHARE_CREATED`/`CAPACITY_EXCEEDED`/`RATE_LIMITED`; prüfen: Tests für jede Validierungsregel, Standardwerte, Kapazitätsgrenze, verschlüsselte Spalten enthalten keinen Klartext
- [ ] 5.2 Lookup implementieren (Metadaten ohne Seiteneffekt, abgelaufen = nicht verfügbar, einheitliche Ausnahme, Rate-Limit `access`, Audit `SHARE_NOT_AVAILABLE`); prüfen: Tests für verfügbaren, unbekannten und abgelaufenen (noch nicht gelöschten) Share, Zähler unverändert
- [ ] 5.3 Abruf implementieren (Zeilensperre, Ablaufprüfung, Passwortprüfung, Fehlversuchszähler mit Löschung beim 5. Fehlversuch, Dekrement, Löschung bei 0, Entschlüsselung, Audit `SHARE_RETRIEVED`/`SHARE_PASSWORD_FAILED`/`SHARE_DELETED`); prüfen: Tests für burn after read, 3 Abrufe, unbegrenzt, falsches Passwort zählt nicht, 5 Fehlversuche löschen, erfolgreicher Abruf setzt Zähler zurück, parallele Abrufe liefern höchstens einmal aus
- [ ] 5.4 Cleanup-Job (`fixedDelay` 60 s) mit Audit `SHARE_DELETED reason=EXPIRED` implementieren; prüfen: Test löscht nur abgelaufene Shares und schreibt je Share einen Audit-Eintrag

## 6. REST-API und Fehlerbehandlung

- [ ] 6.1 Share-Ausnahmen anlegen und im `GlobalExceptionHandler` auf `ErrorResponse` abbilden (400 mit Feldliste, 403, 404 mit einheitlichem Text, 413 inkl. `MaxUploadSizeExceededException`, 429 mit `Retry-After`, 503); prüfen: MockMvc-Tests je Status und Antwortformat
- [ ] 6.2 `SecureShareController` mit `POST /kubiverse/api/shares` (multipart), `/lookup` und `/retrieve` (JSON) implementieren, Datei-Auslieferung als `application/octet-stream`, `Content-Disposition: attachment` mit bereinigtem `filename` und `filename*`, `X-Content-Type-Options: nosniff`; prüfen: MockMvc-Tests für Text- und Datei-Roundtrip, Dateinamen mit Pfadtrennern/Umlauten/Anführungszeichen, 404 identisch für lookup und retrieve
- [ ] 6.3 Fallback-Controller für Profil `no-db` (alle Pfade unter `/kubiverse/api/shares` → 503) implementieren; prüfen: Test im Profil `no-db` liefert 503 und `GET /kubiverse/api/argocd/applications` bleibt gemappt
- [ ] 6.4 Log-Hygiene absichern; prüfen: Integrationstest erstellt und ruft Text- und Datei-Shares mit Passwort ab (inkl. Fehlerfällen) und stellt per Output-Capture sicher, dass weder Inhalt, Dateiname, Passwort noch Token in irgendeiner Log-Ausgabe erscheinen

## 7. nginx und Deployment

- [ ] 7.1 `portal/security-headers.conf` mit den vier bestehenden Headern und der CSP aus design.md D12 anlegen, in `nginx.conf` auf Server-Ebene und in allen `location`-Blöcken mit eigenem `add_header` einbinden, `client_max_body_size 11m` für `/kubiverse/api/` setzen und das Snippet im Portal-Dockerfile kopieren; prüfen: `nginx -t` im gebauten Image erfolgreich und `curl -I` auf `/`, `/index.html` und ein Asset zeigt alle Sicherheitsheader
- [ ] 7.2 `docker-compose.yml` um Dienst `db` (PostgreSQL, Volume `db-data`, kein Host-Port) erweitern und `server` auf Profil `db`, `DB_*`, `SECURE_SHARE_MASTER_KEY` (Pflicht aus Host-Umgebung, kein Standardwert), `SECURE_SHARE_MASTER_KEY_ID` und `SECURE_SHARE_TRUSTED_PROXIES` umstellen; prüfen: `docker compose config` ist gültig und bricht ohne gesetzten Schlüssel mit klarer Meldung ab
- [ ] 7.3 Root-`README.md` und `server/README.md` um Secure Share, Erzeugung des Master-Schlüssels (`openssl rand -base64 32`), neue Umgebungsvariablen und Schlüsselrotation ergänzen; prüfen: die dokumentierten Befehle laufen wie beschrieben

## 8. Frontend

- [ ] 8.1 `src/lib/secureShareApi.ts` implementieren (Header `X-Kubiverse-Client: portal`, create/lookup/retrieve, Statuscode-zu-Meldung-Zuordnung auf Deutsch inkl. Antworten ohne JSON, Netzwerkfehler, Datei-Download über Blob und `Content-Disposition`); prüfen: `npm run build` und `npm run lint` ohne neue Fehler
- [ ] 8.2 Seite `SecureShare.tsx` (Tabs Text/Datei, Zeichenzähler, clientseitige 10-MB-Prüfung, Ablaufzeit-Auswahl mit Standard 24 h, Abrufanzahl 1/2/3/5/10/25/50/100/unbegrenzt mit Standard 1, optionales Passwort, Ergebnisansicht mit Link, Ablaufzeitpunkt, Kopieren mit Fallback, Eingaben bleiben bei Fehlern erhalten); prüfen: Build/Lint grün und manuell im Browser Text- und Datei-Share erstellbar, >10 MB wird vor Upload abgelehnt
- [ ] 8.3 Seite `SecureShareAccess.tsx` (Token aus Route lesen, History per `replace` auf `/share` setzen, Lookup-Anzeige von Typ/Passwortpflicht/Ablauf/verbleibenden Abrufen, „Anzeigen“/„Herunterladen“, Passwortfeld mit Hinweis auf 5 Fehlversuche, Meldungen für 403/404/429/503/Netzwerk, Hinweis nach Löschung, Text nur als React-Text, kein Web-Storage); prüfen: Build/Lint grün und manuell: Adresszeile zeigt nach dem Laden `/#/share`, zweiter Abruf eines burn-after-read-Shares zeigt „nicht verfügbar“
- [ ] 8.4 Routen `/secure-share`, `/share/:token`, `/share` in `App.tsx` und Menüpunkt `Secure Share` im Header (alle Bildschirmgrößen) ergänzen; prüfen: Build/Lint grün und manuell Navigation über den Menüpunkt auf Desktop- und Mobilbreite

## 9. Integrationsprüfung

- [ ] 9.1 End-to-End mit `docker compose up -d --build`: Text-Share einmal abrufbar und danach 404, Datei mit genau 10 MB hoch- und herunterladbar, Datei > 10 MB mit 413 abgelehnt, falsches Passwort fünfmal löscht den Share, 21. Erstellung pro Stunde liefert 429, Application Hub und Bootstrap funktionieren unverändert; prüfen: alle Fälle manuell bzw. per `curl` nachvollzogen
- [ ] 9.2 Security- und Audit-Prüfung im laufenden System: Sicherheitsheader inkl. CSP auf allen Seiten ohne CSP-Verstöße in der Browser-Konsole, `docker compose logs server portal` enthält Audit-Einträge für alle Ereignistypen und keine Tokens, Inhalte, Dateinamen oder Passwörter; prüfen: Log-Durchsicht und `grep` nach Test-Token und Test-Inhalt ohne Treffer
- [ ] 9.3 `openspec validate add-secure-share --strict` ausführen; prüfen: Change ist gültig
