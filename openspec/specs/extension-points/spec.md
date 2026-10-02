# extension-points Specification

## Purpose

Dokumentiert die im Code vorhandenen Stellen, an denen das System konfiguriert oder erweitert werden kann. Aufgeführt sind nur Erweiterungspunkte, die im Code angelegt sind (Konfiguration, vorbereitete, aber ungenutzte Bausteine, Code-Kommentare mit Erweiterungshinweis).

| Erweiterungspunkt | Ort | Stand im Code |
|---|---|---|
| Externe Systeme per Konfiguration | `application.yml` (`argocd.*`, `bitbucket.*`), `ArgoCdProperties` | aktiv |
| Secure-Share-Grenzwerte und Schlüssel | `application.yml` (`secure-share.*`), `SecureShareProperties` | aktiv |
| Frontend-Links per Build-Argument | `VITE_*` in `portal/dockerfile`, `Header`, `DocumentationSection` | aktiv |
| Datenbank (PostgreSQL/JPA) | `build.gradle`, `spring.datasource`/`spring.jpa` in `application.yml` | aktiv für Secure Share (Entität `SecureShare`), um weitere Entitäten erweiterbar |
| Benutzerverwaltung | `CustomUserDetailsService` (Kommentar: "Will be replaced by actual database lookup logic later") | Platzhalter |
| Token-Ausstellung | `JwtTokenUtil.generateToken` | vorhanden, nicht aufgerufen |
| Methodenbasierte Autorisierung | `@EnableMethodSecurity` in `SecurityConfig` | aktiviert, keine Annotationen genutzt |
| CORS-Konfiguration | `SecurityConfig` (Kommentar: "Consider specific cors config for production") | deaktiviert |
| Objekt-Mapping | MapStruct 1.5.5 in `build.gradle` | Abhängigkeit vorhanden, keine Mapper |
| Generische API-Antwort | `dto/ApiResponse<T>` (`message`, `data`) | vorhanden, nicht verwendet |
| Fehlerbehandlung | `GlobalExceptionHandler` | aktiv, um weitere `@ExceptionHandler` erweiterbar |
| Content-Security-Policy | `portal/security-headers.conf` | aktiv, um weitere Quellen erweiterbar |
| UI-Komponentenbibliothek | `portal/src/components/ui` (shadcn/ui, `components.json`) | aktiv |
| Routen | `portal/src/App.tsx` | aktiv |
| Mock-Endpunkte | `mock/server.js` | aktiv |

## Requirements

### Requirement: Konfigurierbare Integrationsziele
Das Backend SHALL die Ziele und Zugangsdaten der ArgoCD- und Bitbucket-Integration ausschließlich über Spring-Properties bzw. Umgebungsvariablen beziehen, sodass ein Wechsel vom Mock auf echte Systeme ohne Codeänderung möglich ist.

#### Scenario: Umstellung auf echtes ArgoCD
- **WHEN** `ARGOCD_URL` und `ARGOCD_API_KEY` auf eine echte ArgoCD-Instanz gesetzt werden
- **THEN** ruft das Backend deren `/api/v1/applications` auf und bildet `argocdUrl` auf Basis dieser URL

#### Scenario: Umstellung auf echtes Bitbucket
- **WHEN** `BITBUCKET_API_URL`, `BITBUCKET_PROJECT`, `BITBUCKET_TEMPLATE_REPO` und `BITBUCKET_TOKEN` gesetzt werden
- **THEN** legt das Backend Repositories im angegebenen Bitbucket-Projekt an und verwendet das angegebene Template

### Requirement: Konfigurierbare Frontend-Links
Das Portal SHALL ArgoCD-UI-Link, Teams-Chat-Link und die vier Dokumentationslinks über die Build-Argumente `VITE_ARGOCD_UI_URL`, `VITE_TEAMS_CHAT_URL`, `VITE_DOCS_DEPLOYMENT_GUIDE_URL`, `VITE_DOCS_GIT_CONVENTIONS_URL`, `VITE_DOCS_CICD_PIPELINE_URL` und `VITE_DOCS_TROUBLESHOOTING_URL` konfigurierbar machen.

#### Scenario: Neue Dokumentations-URL
- **WHEN** das Portal-Image mit geändertem `VITE_DOCS_TROUBLESHOOTING_URL` neu gebaut wird
- **THEN** verweist der Troubleshooting-Link auf die neue URL

### Requirement: Erweiterbare Security-Bausteine
Das Backend SHALL die Bausteine für eine Token-basierte Authentifizierung (`JwtTokenUtil` mit Erzeugung und Validierung, austauschbarer `UserDetailsService`, aktivierte Method Security) bereitstellen, auch wenn Login-Endpunkt und Autorisierungsregeln noch fehlen.

#### Scenario: Austausch der Benutzerquelle
- **WHEN** eine andere `UserDetailsService`-Implementierung anstelle von `CustomUserDetailsService` bereitgestellt wird
- **THEN** verwendet der `JwtAuthenticationFilter` diese zum Laden der Benutzer

### Requirement: Erweiterbare Fehlerbehandlung
Der `GlobalExceptionHandler` SHALL als zentraler Ort für die Abbildung von Ausnahmen auf HTTP-Antworten im Format `ErrorResponse` dienen.

#### Scenario: Neue Ausnahme ohne eigenen Handler
- **WHEN** eine neue Ausnahme ohne spezifischen `@ExceptionHandler` auftritt
- **THEN** wird sie vom generischen Handler mit HTTP 500 beantwortet

### Requirement: Erweiterbares Frontend
Das Portal SHALL neue Seiten über Routen in `App.tsx`, neue Datenabfragen über TanStack React Query und neue UI-Elemente über die shadcn/ui-Komponenten in `src/components/ui` (Importpfad-Alias `@` → `src`) ermöglichen.

#### Scenario: Neue Route
- **WHEN** eine `<Route>` in `App.tsx` vor der Catch-All-Route `*` ergänzt wird
- **THEN** ist die Seite unter `/#/<pfad>` erreichbar

### Requirement: Erweiterbarer Mock
Der Mock SHALL als Express-Anwendung um weitere simulierte Endpunkte externer Systeme erweiterbar sein.

#### Scenario: Neuer simulierter Endpunkt
- **WHEN** in `mock/server.js` eine weitere Route registriert wird
- **THEN** ist sie nach Neustart des Mocks auf Port 12004 erreichbar
