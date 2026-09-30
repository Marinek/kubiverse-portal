# Design

## Context

Siehe proposal.md (Why) und die Specs unter `specs/` für die Anforderungen. Folgende Punkte des Ist-Zustands prägen den Ansatz:

- Das Backend (Spring Boot 3.4, Java 21) läuft standardmäßig im Profil `no-db`. Spring Data JPA und der PostgreSQL-Treiber sind als Abhängigkeiten vorhanden, es gibt aber weder Entitäten noch Repositories. Die Datasource-Zugangsdaten stehen fest in `application.yml`.
- Die Spring-Security-Filterkette ist zustandslos, CSRF und CORS sind deaktiviert, es gibt keine Autorisierungsregeln. Secure Share bleibt ohne Anmeldung nutzbar; das ist eine Produktentscheidung, der Betrieb erfolgt nur im internen Netz.
- nginx leitet `/kubiverse/api/` an `server:8080` weiter. Es gilt die Standard-Grenze `client_max_body_size` von 1 MB. Sicherheitsheader auf Server-Ebene greifen nicht in `location`-Blöcken mit eigenem `add_header`.
- Das Frontend nutzt `HashRouter`, TanStack React Query und shadcn/ui. `index.html` lädt Google Fonts, der Header lädt das ArgoCD-Logo extern, und `components/ui/chart.tsx` erzeugt Inline-`<style>`.
- Das Backend ist in Docker Compose zusätzlich direkt auf Port 8080 veröffentlicht.

## Goals / Non-Goals

**Goals:**
- Verschlüsselung ruhender Daten, sodass ein reiner Datenbankzugriff keine Inhalte offenlegt
- Atomare Abrufzählung ohne Doppel-Auslieferung bei parallelen Abrufen
- Zugriffsgeheimnis erscheint nie in URLs, die den Server erreichen, und nie in Logs
- Keine neuen Laufzeit-Abhängigkeiten außer PostgreSQL als Dienst; Kryptografie über JDK und Spring Security Crypto
- Bestehende Funktionen (Application Hub, Bootstrap) bleiben unverändert, auch im Profil `no-db`

**Non-Goals:**
- Anmeldung und Autorisierung für Ersteller oder Empfänger
- Ende-zu-Ende-Verschlüsselung im Browser (bewusst serverseitig entschieden)
- Vorzeitiges Löschen oder Widerrufen durch den Ersteller
- Virenscan hochgeladener Dateien
- Mehrere Dateien pro Share, Benachrichtigungen per E-Mail
- Über Instanzen hinweg konsistente Anfragebegrenzung
- Kubernetes-Manifeste (nicht Teil des Repositories)

## Decisions

### D1: PostgreSQL als einziger Speicher für Metadaten und Chiffrate
Metadaten und verschlüsselte Inhalte liegen gemeinsam in einer Tabelle `secure_share`, Inhalte als `bytea`. Bei höchstens 10 MB pro Share und höchstens 1 GB gesamt ist das vertretbar.
- **Warum:** Erstellen, Abrufzählung und Löschen laufen in derselben Transaktion; Datei und Metadaten können nicht auseinanderlaufen. JPA und der Treiber sind bereits vorhanden.
- **Alternativen:** Dateisystem-Volume plus Metadaten in der DB (zwei Speicher, kein gemeinsames Commit, verwaiste Dateien möglich). In-Memory-Speicher (Datenverlust bei Neustart, nicht mehrinstanzfähig). Object Storage (neue Infrastruktur).
- **Schema:** `id` (UUID), `token_hash` (Byte-Array, eindeutiger Index), `type` (`TEXT`|`FILE`), `ciphertext`, `content_iv`, `filename_ciphertext`, `filename_iv` (nur `FILE`), `wrapped_dek`, `dek_iv`, `key_id`, `size_bytes`, `password_hash` (nullable), `failed_password_attempts`, `max_downloads` (nullable = unbegrenzt), `remaining_downloads` (nullable), `created_at`, `expires_at` (Index).
- **Schemaverwaltung:** Beibehaltung von `ddl-auto: update` gemäß bestehender Konfiguration. `show-sql` bleibt aktiv; Hibernate gibt dabei keine Bind-Parameter aus.

### D2: Profilsteuerung und Verfügbarkeit
Alle Secure-Share-Beans mit Datenbankbezug (Entität, Repository, Service, Cleanup-Job) sind mit `@Profile("!no-db")` annotiert. Im Profil `no-db` beantwortet ein schlanker Fallback-Controller alle Pfade unter `/kubiverse/api/shares` mit 503.
- **Warum:** `no-db` schließt JPA-Autokonfiguration aus; ohne Profilbindung würde der Kontext nicht starten. Der Application Hub bleibt ohne Datenbank nutzbar.
- Docker Compose setzt `SPRING_PROFILES_ACTIVE=db`. Die Datasource wird auf `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` mit den bisherigen Werten als lokale Standardwerte umgestellt.

### D3: Envelope-Verschlüsselung mit AES-256-GCM
Pro Share wird ein zufälliger 256-Bit-Datenschlüssel (DEK) erzeugt. Inhalt und Dateiname werden jeweils mit dem DEK per AES-256-GCM und eigener 96-Bit-Zufalls-IV verschlüsselt. Der DEK wird mit dem Master-Schlüssel (KEK aus `SECURE_SHARE_MASTER_KEY`, Base64, 32 Byte) ebenfalls per AES-256-GCM verpackt. Als Associated Data dient die Share-`id`, sodass Chiffrate nicht zwischen Datensätzen vertauscht werden können.
- **Warum:** JDK-Bordmittel (`javax.crypto`), authentifizierte Verschlüsselung, keine Wiederverwendung von Schlüssel/IV-Paaren. Schlüsselrotation erfordert kein Neuverschlüsseln der Inhalte.
- **Rotation:** Jeder Datensatz speichert `key_id`. Konfiguriert sind ein aktueller und optional ein vorheriger Schlüssel. Nach spätestens 7 Tagen kann der vorherige Schlüssel entfernt werden, da alle damit verschlüsselten Shares abgelaufen sind.
- **Start:** Fehlt der Schlüssel oder hat er nicht 32 Byte, bricht der Start im Profil mit Datenbank ab (Fail-fast). Die Fehlermeldung enthält den Wert nicht.
- **Alternativen:** Direkte Verschlüsselung mit dem Master-Schlüssel (Rotation erfordert Neuverschlüsselung). Datenbankseitige Verschlüsselung per `pgcrypto` (Schlüssel wandert in SQL-Statements). Schlüsselableitung aus dem Passwort (nur für passwortgeschützte Shares möglich, uneinheitliches Modell; verworfen zugunsten der gewählten serverseitigen Verschlüsselung).

### D4: Zugriffsgeheimnis und Link-Format
Das Token besteht aus 32 Byte aus `SecureRandom`, Base64url ohne Padding (43 Zeichen). Gespeichert wird nur `SHA-256(token)` als Lookup-Schlüssel. Der Link lautet `<origin>/#/share/<token>`.
- **Warum:** Das Fragment wird vom Browser weder an nginx noch an das Backend gesendet und erscheint in keinem Referrer. Wegen der hohen Entropie genügt ein schneller Hash; Salting und BCrypt sind nicht nötig und würden den indizierten Lookup verhindern.
- API-Aufrufe übertragen das Token ausschließlich im JSON-Body (`lookup`, `retrieve`), nie im Pfad oder Query-String. Damit erscheint es nicht in nginx-Access-Logs.
- Die Empfängerseite liest das Token aus der Route, hält es im React-State und ersetzt den History-Eintrag per `navigate('/share', { replace: true })`. Das Token verschwindet so aus Adresszeile und Verlauf.
- **Alternativen:** Getrennte ID und Schlüssel im Link (keine zusätzliche Sicherheit, da der Server ohnehin entschlüsselt). Token im Pfad (landet in Access-Logs).

### D5: Passwortschutz mit BCrypt
Optionale Passwörter werden mit dem `BCryptPasswordEncoder` aus Spring Security Crypto gehasht. Fehlversuche werden unter Zeilensperre gezählt; beim 5. Fehlversuch wird der Share gelöscht. Ein erfolgreicher Abruf setzt den Zähler zurück.
- **Warum:** Bereits vorhandene Abhängigkeit; langsamer Hash als Schutz der Passwörter bei Datenbankabfluss.

### D6: Download-Ablauf und atomare Abrufzählung
- `lookup` liest Metadaten ohne Seiteneffekt. Die Empfängerseite ruft es automatisch beim Laden auf; Link-Vorschauen von Chat- oder Mail-Programmen laden nur die statische SPA und lösen keine API-Aufrufe aus.
- `retrieve` läuft in einer Transaktion mit `SELECT … FOR UPDATE` auf den Datensatz: Ablauf prüfen, Passwort prüfen, `remaining_downloads` dekrementieren, entschlüsseln, bei 0 den Datensatz löschen, committen, danach ausliefern.
- **Warum:** Die Zeilensperre verhindert Doppel-Auslieferung bei parallelen Abrufen.
- **Auslieferung:** Text als JSON `{"text": …}`. Dateien als `application/octet-stream` mit `Content-Disposition: attachment` und bereinigtem Dateinamen (Steuerzeichen, Pfadtrenner und Anführungszeichen entfernt, RFC-5987-`filename*` für Nicht-ASCII) sowie `X-Content-Type-Options: nosniff`.
- **Frontend-Download:** `fetch` (POST) → `Blob` → Object-URL → temporärer `<a download>`-Klick → sofortiges `URL.revokeObjectURL`. Der Dateiname wird aus `Content-Disposition` gelesen. Bei 10 MB ist der Speicherbedarf unkritisch.
- **Text-Anzeige:** Die Darstellung erfolgt als React-Text, nie per `dangerouslySetInnerHTML`. Das Kopieren nutzt `navigator.clipboard`; ist die API nicht verfügbar (kein Secure Context), wird der Text zum manuellen Kopieren markiert.

### D7: Größenlimits auf allen Ebenen
- **Frontend:** Prüfung von `file.size` vor dem Upload und Zeichenzähler am Textfeld.
- **nginx:** `client_max_body_size 11m` in `location /kubiverse/api/`, mit Puffer für Multipart-Overhead und übrige Felder.
- **Spring:** `spring.servlet.multipart.max-file-size=10MB`, `max-request-size=11MB`. Zusätzlich prüft der Service exakt `size ≤ 10 485 760` und `size > 0`.
- `MaxUploadSizeExceededException` wird im `GlobalExceptionHandler` auf 413 abgebildet. Eine 413-Antwort von nginx (HTML) wertet das Frontend anhand des Status aus.

### D8: Fehlerbehandlung
Eigene Ausnahmen (`ShareValidationException` → 400, `ShareNotAvailableException` → 404, `SharePasswordException` → 403, `RateLimitExceededException` → 429 mit `Retry-After`, `ShareCapacityException`/Feature nicht verfügbar → 503) werden im bestehenden `GlobalExceptionHandler` auf `ErrorResponse` abgebildet. Die Meldungen sind fest formuliert und enthalten keine Eingabewerte.
- 404 hat für alle Ursachen denselben Text (`Share not available`). Der Grund wird nur im Audit-Log unterschieden, soweit er bekannt ist.
- **Frontend:** Ein zentraler Helfer ordnet HTTP-Status deutschsprachigen Meldungen zu und nutzt `details` für Feldhinweise bei 400. Netzwerkfehler (`TypeError` von `fetch`) führen zu einer Meldung mit „Erneut versuchen“. Formulareingaben bleiben bei Fehlern erhalten; nur das Passwortfeld wird nach 403 geleert.

### D9: Missbrauchsschutz
- **Anfragebegrenzung:** In-Memory-Fixed-Window-Zähler je `(Client-IP, Aktion)` in einer `ConcurrentHashMap`. Aktionen sind `create` und `access` (`lookup` und `retrieve` zusammen). Abgelaufene Fenster werden periodisch entfernt. Die Grenzwerte kommen aus `SecureShareProperties` (`secure-share.rate-limit.*`).
- **Kapazität:** Vor jedem Insert werden `count(*)` und `sum(size_bytes)` der nicht abgelaufenen Shares geprüft (`secure-share.capacity.max-shares`, `max-total-bytes`).
- **Client-IP:** `server.forward-headers-strategy=native` mit `server.tomcat.remoteip.internal-proxies`, gesetzt aus `SECURE_SHARE_TRUSTED_PROXIES` (Regex). In Compose ist das das Docker-Netz; in Produktion die Adresse des Ingress bzw. nginx.
- **CSRF-Ersatz:** Ein Filter für `/kubiverse/api/shares/**` verlangt den Header `X-Kubiverse-Client: portal`. `multipart/form-data` wäre sonst ein CORS-„simple request“ und von fremden Seiten auslösbar. Mit dem Header wird ein Preflight nötig; da CORS deaktiviert ist, schlägt er fehl.
- **Alternativen:** Bucket4j oder Redis (neue Abhängigkeit bzw. Infrastruktur, bei einer Instanz nicht nötig). CAPTCHA (unverhältnismäßig im internen Netz).

### D10: Automatische Löschung
Ein `@Scheduled`-Job (`fixedDelay` 60 s, `@EnableScheduling`) löscht `WHERE expires_at < now()` per Bulk-Delete und schreibt je gelöschtem Share ein Audit-Ereignis. Dafür werden zuerst die IDs gelesen, dann gelöscht. Alle Lese- und Abrufpfade prüfen `expires_at` zusätzlich selbst, sodass abgelaufene Shares vor dem Job-Lauf nicht mehr abrufbar sind.
- **Warum:** Der Job ist idempotent und braucht bei mehreren Instanzen keinen Lock; doppelte Läufe löschen schlicht nichts.

### D11: Audit Logging
Ein eigener SLF4J-Logger `AUDIT` schreibt einzeilige Key-Value-Einträge nach stdout, z. B. `event=SHARE_CREATED shareId=… type=FILE sizeBytes=… expiresAt=… maxDownloads=1 passwordProtected=true clientIp=…`. Die Sammlung erfolgt über die Container-Logs der Plattform.
- **Ereignisse:** `SHARE_CREATED`, `SHARE_RETRIEVED`, `SHARE_PASSWORD_FAILED`, `SHARE_DELETED` (`reason=EXPIRED|CONSUMED|PASSWORD_ATTEMPTS`), `SHARE_NOT_AVAILABLE`, `RATE_LIMITED` (`action=…`), `CAPACITY_EXCEEDED`.
- Eine zentrale `AuditLogger`-Klasse akzeptiert nur typisierte Felder (keine freien Strings für Inhalte), um versehentliches Loggen vertraulicher Daten strukturell zu verhindern. `shareId` ist die interne UUID, nicht das Token. Bei `SHARE_NOT_AVAILABLE` wird keine Kennung protokolliert.
- **Alternativen:** Audit-Tabelle in der DB (bräuchte eigene Aufbewahrungsregeln und widerspräche dem Ziel, nach Ablauf nichts mehr zu speichern). Spring Boot Actuator AuditEvents (auf Authentifizierung ausgerichtet, zusätzliche Abhängigkeit).

### D12: nginx-Sicherheitsheader und CSP
Die Sicherheitsheader wandern in eine Snippet-Datei `security-headers.conf`, die auf Server-Ebene und in jedem `location`-Block mit eigenem `add_header` per `include` eingebunden wird. Das Portal-Dockerfile kopiert das Snippet nach `/etc/nginx/snippets/`. CSP:
`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://argo-cd.readthedocs.io; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'`
- `'unsafe-inline'` bei `style-src` ist nötig wegen Inline-`style`-Attributen (Hero) und des `<style>` in `chart.tsx`. Skripte bleiben strikt.
- `location /kubiverse/api/` erhält `client_max_body_size 11m`.

### D13: Frontend-Aufbau
- **Seiten:** `pages/SecureShare.tsx` (Route `/secure-share`, Tabs „Text“/„Datei“, Auswahl der Ablaufzeit, Auswahl der Abrufanzahl `1, 2, 3, 5, 10, 25, 50, 100, unbegrenzt` mit Standard 1, optionales Passwort, Ergebnisansicht mit Link und Kopier-Button) und `pages/SecureShareAccess.tsx` (Routen `/share/:token` und `/share`).
- **API-Funktionen** in `lib/secureShareApi.ts` setzen immer `X-Kubiverse-Client: portal`. Mutationen laufen über `useMutation` von React Query, `lookup` über `useQuery` mit `retry: false` und ohne Refetch bei Fokuswechsel. Ein Refetch würde zwar nichts verbrauchen, liefert aber nach dem letzten Abruf verwirrende 404-Zustände.
- **Header:** Menüpunkt `Secure Share` als `Link` neben „Application Hub“, auf allen Bildschirmgrößen sichtbar.
- Die UI-Komponenten stammen aus dem bestehenden `components/ui` (Tabs, Textarea, Input, Select, Button, Card, Alert).

## Risks / Trade-offs

- [Serverseitige Verschlüsselung: Wer DB und Master-Schlüssel besitzt, kann Inhalte lesen] → Der Schlüssel liegt nur in der Laufzeitumgebung (Secret), nie im Repository; die Speicherdauer ist auf höchstens 7 Tage begrenzt; die Rotation wird unterstützt.
- [PostgreSQL gibt gelöschte Zeilen erst nach VACUUM physisch frei; Chiffrat und verpackter DEK liegen bis dahin auf der Platte] → Autovacuum ist aktiv; die Daten bleiben verschlüsselt; Restrisiko nur bei gleichzeitigem Besitz des KEK.
- [Keine Anmeldung: Jeder im internen Netz kann Shares erstellen] → Anfrage- und Kapazitätsgrenzen, Audit-Log mit Client-IP, Betrieb nur im internen Netz.
- [Direkt veröffentlichter Backend-Port 8080 in Compose; der Docker-Gateway liegt in einem privaten Netz und könnte als vertrauenswürdiger Proxy gelten] → `SECURE_SHARE_TRUSTED_PROXIES` wird explizit gesetzt statt der Tomcat-Standard-Regex. In Produktion ist das Backend nur über den Reverse Proxy erreichbar.
- [In-Memory-Anfragebegrenzung gilt je Instanz und geht bei Neustart verloren] → Für den aktuellen Einzelinstanzbetrieb ausreichend; bei Skalierung auf einen gemeinsamen Speicher umstellen.
- [At-most-once-Auslieferung: Bricht die Verbindung nach dem Commit ab, ist ein Burn-after-read-Share verloren] → Bewusster Trade-off zugunsten der Garantie, dass höchstens ein Empfänger den Inhalt erhält; der Ersteller kann neu teilen.
- [Link mit Token bleibt in E-Mail oder Chat des Empfängers erhalten] → Standard „burn after read“, kurze Ablaufzeiten, optionales Passwort über einen zweiten Kanal.
- [Hochgeladene Dateien werden nicht auf Schadsoftware geprüft] → Auslieferung ausschließlich als Download mit `nosniff`; Hinweis auf der Empfängerseite, Dateien nur von bekannten Absendern zu öffnen.
- [Audit-Logs enthalten IP-Adressen (personenbezogene Daten)] → Keine Inhalte in Logs; die Aufbewahrung regelt die zentrale Log-Plattform (siehe Open Questions).
- [CSP kann bestehende Seiten beeinträchtigen] → Die Policy ist auf die bekannten externen Quellen abgestimmt; Smoke-Test aller Seiten nach dem Deployment.
- [`ddl-auto: update` ist für Produktion wenig kontrolliert] → Für ein einzelnes neues, flüchtiges Datenmodell akzeptabel; eine Umstellung auf Migrationswerkzeuge bleibt ein eigener Change.
- [`navigator.clipboard` ist ohne HTTPS (außer auf localhost) nicht verfügbar] → Fallback: Text markieren zum manuellen Kopieren.

## Migration Plan

1. PostgreSQL bereitstellen (Compose-Dienst `db` mit Volume `db-data`; in Produktion eine verwaltete Instanz).
2. Master-Schlüssel erzeugen (32 Byte zufällig, Base64) und als Secret hinterlegen (`SECURE_SHARE_MASTER_KEY`, `SECURE_SHARE_MASTER_KEY_ID`).
3. Backend mit Profil `db`, `DB_*`, `SECURE_SHARE_TRUSTED_PROXIES` und optionalen Grenzwerten deployen. Die Tabelle wird beim Start per `ddl-auto` angelegt.
4. Portal-Image mit neuer `nginx.conf` und Snippet deployen; danach Header und CSP auf allen Seiten prüfen.
5. **Rollback:** Das vorherige Portal- und Backend-Image deployen. Die Tabelle `secure_share` kann gelöscht werden, da alle Daten flüchtig sind (höchstens 7 Tage). Alternativ das Backend auf `no-db` zurücksetzen; Secure Share antwortet dann mit 503.
6. **Schlüsselrotation:** Neuen Schlüssel als aktuellen und den bisherigen als vorherigen setzen und neu starten. Nach 7 Tagen den vorherigen Schlüssel entfernen.

## Open Questions

- Aufbewahrungsdauer der Audit-Logs in der zentralen Log-Plattform (betrifft nicht das System, sondern den Betrieb).
- Produktive Grenzwerte (Anfragen, Kapazität) nach den ersten Betriebswochen justieren; die Standardwerte sind in den Specs festgelegt und konfigurierbar.
