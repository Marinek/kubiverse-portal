# Spec Delta

## REMOVED Requirements

### Requirement: Aktivierbare Datenbankanbindung
Das Backend SHALL eine PostgreSQL-Anbindung über Spring Data JPA vorhalten, die durch Verlassen des Profils `no-db` aktiviert wird (`ddl-auto: update`, `show-sql: true`). Die Verbindung MUST über `DB_URL`, `DB_USERNAME` und `DB_PASSWORD` konfigurierbar sein.

#### Scenario: Start ohne Profil no-db
- **WHEN** `SPRING_PROFILES_ACTIVE` auf einen anderen Wert als `no-db` gesetzt wird und `DB_URL` nicht gesetzt ist
- **THEN** versucht das Backend, sich mit `jdbc:postgresql://localhost:12002/kubiverse-portal` zu verbinden

**Reason**: Secure Share wird ausschließlich im Arbeitsspeicher des einzelnen Backendprozesses gehalten und benötigt keine Datenbankanbindung.
**Migration**: PostgreSQL/JPA-Konfiguration und Datenbankabhängigkeiten werden entfernt. Deployments verwenden keine `DB_*`-Variablen mehr; ein altes Datenbankvolume wird nur nach ausdrücklicher Prüfung manuell gelöscht.