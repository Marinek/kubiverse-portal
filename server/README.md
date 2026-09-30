# Kubiverse Portal - Backend Server

This is the Spring Boot backend for the Kubiverse Portal application. 
It follows strict layering, clean code principles, and focuses on OWASP security standards as defined in `.cursorrules`.

## Tech Stack
- Java 21
- Spring Boot 3.4.x
- Gradle
- PostgreSQL
- Spring Security (JWT Stateless Authentication)
- Lombok & MapStruct

## Getting Started

1. Ensure the PostgreSQL database and pgAdmin are running via the root `docker-compose.yml`:
   ```bash
   cd ../
   docker-compose up -d
   ```
2. For the initial run, Gradle might need to download dependencies. To create the wrapper on your machine:
   ```bash
   gradle wrapper
   ```
   (Alternatively, if you already have the wrapper, use `./gradlew bootRun`).

## Architecture
- `controller`: REST APIs
- `service`: Business logic
- `repository`: DB access
- `entity`: Database models
- `dto`: API requests/responses
- `mapper`: MapStruct interfaces
- `security`: JWT and Security configs
- `exception`: Global controller advice

## Rules Followed
- No `@Autowired` on fields, use Constructor Injection (`@RequiredArgsConstructor`).
- DTOs used for all API endpoints.
- Strict method and URL based security.

## Running Tests
Without a local Gradle installation, tests can be run in a container:
```bash
docker run --rm -v "$PWD":/app -w /app gradle:9-jdk21-alpine gradle test --no-daemon
```

## Secure Share
Secure Share requires a database, i.e. any profile other than `no-db`. In the `no-db` profile its endpoints answer with HTTP 503.

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | local PostgreSQL on port 12002 | Database connection |
| `SECURE_SHARE_MASTER_KEY` | – (required) | Base64-encoded 256-bit master key |
| `SECURE_SHARE_MASTER_KEY_ID` | `k1` | Identifier stored with each share |
| `SECURE_SHARE_PREVIOUS_MASTER_KEY` / `_ID` | – | Previous key during rotation |
| `SECURE_SHARE_TRUSTED_PROXIES` | `127.0.0.1` and `::1` | Regex of proxies whose `X-Forwarded-For` is trusted |
| `SECURE_SHARE_RATE_LIMIT_CREATE_PER_HOUR` | `20` | Share creations per client IP and hour |
| `SECURE_SHARE_RATE_LIMIT_ACCESS_PER_HOUR` | `60` | Lookups and downloads per client IP and hour |
| `SECURE_SHARE_MAX_SHARES` | `1000` | Maximum number of active shares |
| `SECURE_SHARE_MAX_TOTAL_BYTES` | `1073741824` | Maximum stored content in bytes (1 GB) |

Generate a master key:
```bash
openssl rand -base64 32
```

Key rotation: set the new key as `SECURE_SHARE_MASTER_KEY` with a new `SECURE_SHARE_MASTER_KEY_ID`, move the old key and id to `SECURE_SHARE_PREVIOUS_MASTER_KEY` / `SECURE_SHARE_PREVIOUS_MASTER_KEY_ID` and restart. After 7 days all shares encrypted with the old key have expired and the previous key can be removed.

Audit events are written to the `AUDIT` logger (stdout) and never contain content, filenames, passwords or tokens.
