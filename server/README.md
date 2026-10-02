# Kubiverse Portal - Backend Server

This is the Spring Boot backend for the Kubiverse Portal application. 
It follows strict layering, clean code principles, and focuses on OWASP security standards as defined in `.cursorrules`.

## Tech Stack
- Java 21
- Spring Boot 3.4.x
- Gradle
- Process-local in-memory Secure Share storage
- Spring Security (JWT Stateless Authentication)
- Lombok & MapStruct

## Getting Started

1. Start the mock and backend from the repository root:
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
- process-local in-memory Secure Share storage
- `entity`: Secure Share data models
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
Secure Share is available in the default Spring profile and stores encrypted shares and metadata only in the backend process memory. All shares are lost when the process or container stops or restarts. Operate exactly one backend instance; multiple replicas do not share data. The default content budget is 256 MiB (`268435456` bytes). Set container/JVM memory higher than this limit to leave room for encryption buffers, metadata and the rest of the application.

| Variable | Default | Purpose |
|---|---|---|
| `SECURE_SHARE_MASTER_KEY` | – (required) | Base64-encoded 256-bit master key |
| `SECURE_SHARE_MASTER_KEY_ID` | `k1` | Identifier stored with each share |
| `SECURE_SHARE_PREVIOUS_MASTER_KEY` / `_ID` | – | Previous key during rotation |
| `SECURE_SHARE_TRUSTED_PROXIES` | `127.0.0.1` and `::1` | Regex of proxies whose `X-Forwarded-For` is trusted |
| `SECURE_SHARE_RATE_LIMIT_CREATE_PER_HOUR` | `20` | Share creations per client IP and hour |
| `SECURE_SHARE_RATE_LIMIT_ACCESS_PER_HOUR` | `60` | Lookups and downloads per client IP and hour |
| `SECURE_SHARE_MAX_SHARES` | `1000` | Maximum number of active shares |
| `SECURE_SHARE_MAX_TOTAL_BYTES` | `268435456` | Maximum content in memory (256 MiB) |

Generate a master key:
```bash
openssl rand -base64 32
```

Key rotation: set the new key as `SECURE_SHARE_MASTER_KEY` with a new `SECURE_SHARE_MASTER_KEY_ID`, move the old key and id to `SECURE_SHARE_PREVIOUS_MASTER_KEY` / `SECURE_SHARE_PREVIOUS_MASTER_KEY_ID` and restart. After 7 days all shares encrypted with the old key have expired and the previous key can be removed.

Audit events are written to the `AUDIT` logger (stdout) and never contain content, filenames, passwords or tokens.

### Retired PostgreSQL Volume
The Compose configuration no longer declares PostgreSQL and does not automatically remove volumes left by older deployments. To remove only the legacy database volume after confirming its data is no longer needed:

```bash
docker volume ls --filter label=com.docker.compose.volume=db-data
docker volume inspect <exact-volume-name>
docker volume rm <exact-volume-name>
```

**Warning:** the final command permanently deletes that volume's data. Inspect the exact volume and verify it belongs to the retired Kubiverse deployment before removal; do not use a broad volume-prune command.
