# Proposal

## Why

Secure Share currently writes encrypted payloads and metadata to PostgreSQL and keeps them across container restarts, which conflicts with the intended ephemeral handling of secrets. An in-memory store removes the database and its persistent volume while preserving short-lived sharing during the lifetime of the backend process.

## What Changes

- Replace PostgreSQL-backed share persistence with a bounded in-memory store; retain the existing API, AES-GCM encryption, expiry, password protection, download limits, rate limits, and audit events.
- Make Secure Share available in the default backend profile and remove the unavailable `no-db` fallback.
- Remove PostgreSQL, JPA, H2, database configuration, Compose service, and persistent database volume configuration.
- Set the default active-share capacity to 256 MiB, configurable through the existing capacity setting.
- **BREAKING** Active shares are lost when the backend process/container stops or restarts; only one backend instance is supported because the store is process-local.
- Document that any legacy `db-data` Docker volume is not removed automatically and requires explicit operator cleanup if its old data should be deleted.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backend-api`: Secure-Share endpoints no longer return 503 solely because the `no-db` profile is active; the profile is removed.
- `secure-share`: Store encrypted shares in volatile memory and expose Secure Share without a database; active shares disappear on process restart.
- `deployment`: Remove PostgreSQL and persistent-volume orchestration; document volatile lifetime, single-instance operation, and legacy-volume cleanup.
- `platform-overview`: Describe the backend and Compose architecture without a database.
- `extension-points`: Remove the active PostgreSQL/JPA extension point and database-profile behavior.

## Impact

- Backend persistence model, share cleanup and concurrency handling, Spring profiles, and persistence-related tests.
- `server/build.gradle`, `server/src/main/resources/application.yml`, and `docker-compose.yml`.
- No route or request/response payload changes. The `no-db`-profile 503 case is removed; capacity exhaustion still returns 503. AES-GCM encryption and the configured master key remain in use.
- Deployments must tolerate losing active shares on backend restart and must run one backend instance.