# Tasks

## 1. Implement the bounded in-memory store

- [x] 1.1 Add a process-local share store with immutable token-hash keys, atomic capacity admission, a 1,000-share limit, and a configurable 256-MiB default payload budget; verify store tests for lookup, capacity boundaries, and concurrent create attempts.
- [x] 1.2 Refactor share creation, lookup, retrieval, password-attempt tracking, download consumption, and expiry cleanup to use the store with per-share synchronization; verify tests for expiry, password lockout, deletion, and concurrent retrieval never exceeding the configured download count.

## 2. Remove database dependencies from the backend

- [x] 2.1 Replace JPA entity/repository use and transaction-based locking with the in-memory store; remove database profile gates and the `no-db` 503 fallback so Secure Share is active by default; verify controller and application-context tests run without a datasource and preserve unrelated API mappings.
- [x] 2.2 Remove Spring Data JPA, PostgreSQL and H2 dependencies plus datasource/JPA and profile configuration; replace repository/profile-specific tests with in-memory store and default-profile tests; verify the backend test suite passes without connecting to a database.

## 3. Remove database deployment wiring and update documentation

- [x] 3.1 Remove the PostgreSQL service, `db-data` volume, database environment variables, and database startup dependency from `docker-compose.yml`; verify `docker compose config` succeeds and defines only `mock`, `server`, and `portal`.
- [x] 3.2 Update the root and server READMEs to describe volatile share lifetime, single-instance operation, the 256-MiB default, required key configuration, and heap headroom; document explicit, narrowly scoped cleanup of an obsolete `db-data` volume with a data-loss warning; verify no current README claims PostgreSQL is required.
- [x] 3.3 Sync the change deltas into the durable OpenSpec specs and update descriptive architecture/configuration tables to remove PostgreSQL and `no-db` behavior; verify `openspec validate use-in-memory-secure-share-storage --strict` passes and no active specs describe the old behavior.

## 4. Verify deployment behavior

- [x] 4.1 In a disposable Compose project, build and start the stack without PostgreSQL, create and retrieve a share, restart only the backend, and verify the old token returns HTTP 404 while the portal and Application Hub remain available.
- [x] 4.2 Run the full backend test suite and a final Compose configuration check; verify no PostgreSQL/JPA runtime dependency or persistent share volume remains in the built configuration.