# Design

## Context

See `proposal.md` for motivation and `specs/` for the behavioral contract. Secure Share currently depends on a JPA entity/repository, Spring transactions and row locks; `no-db` disables the controller and crypto service. The existing rate limiter is already process-local. Docker Compose currently runs one backend instance and a PostgreSQL service with a named data volume.

## Goals / Non-Goals

**Goals:**
- Keep the existing share API and security behavior while eliminating PostgreSQL and persistent share storage.
- Bound in-process share data to 1,000 entries and 256 MiB of content by default.
- Preserve at-most-once download semantics for concurrent requests handled by the single backend process.
- Make expiry cleanup, capacity accounting, and audit events work without transactions.

**Non-Goals:**
- Survive backend restarts, support multiple backend replicas, or provide a shared/distributed store.
- Change the portal or its endpoint contracts.
- Automatically delete existing Docker volumes or perform a destructive migration.
- Remove AES-GCM encryption or the externally configured master key.

## Decisions

### D1: Process-local in-memory store

Replace JPA persistence with a bounded store owned by the backend process. The store holds share records keyed by an immutable encoding of the token hash; encrypted content, encrypted filename, wrapped data key, metadata, password hash and counters exist only in heap memory. Do not write share content or metadata to files, database services, or persistent volumes.

**Alternatives:** PostgreSQL or Redis would preserve shares across requests and could support multiple replicas, but introduce durable or external storage contrary to the requested lifecycle. A temporary filesystem still writes data outside process memory and has less predictable cleanup.

### D2: Explicit synchronization replaces database transactions

Protect each share's password attempts and remaining-download count with per-entry synchronization. A retrieve operation validates availability, checks the password, decrements the count and removes a consumed share as one critical section; no more successful retrieves may exceed the configured count. Protect insertion and shared capacity accounting with a store-level critical section so simultaneous creates cannot exceed the 1,000-share or 256-MiB limits. Lookup returns a metadata snapshot and does not consume a download.

**Alternatives:** A single global lock would be simpler but serialize unrelated shares. Lock-free map updates would make the coupled password, expiry and download state difficult to update atomically.

### D3: Expiry and deletion operate on live entries

Keep the expiry check in lookup and retrieve so an expired share is unavailable immediately even before cleanup. A scheduled cleanup removes expired entries and emits the existing audit event, meeting the five-minute deletion bound. Consumed shares and shares deleted after five incorrect passwords are removed during the synchronized operation. Store removal means the share is no longer reachable through the service; the design does not promise forensic heap zeroization.

### D4: Preserve the existing encryption and API

Keep AES-256-GCM envelope encryption, token hashing, BCrypt password hashes, key configuration, validation, rate limiting, audit logging and HTTP behavior. Remove only database-specific annotations, repository calls, transaction annotations, profile gates and database configuration. Make the share controller, service and crypto service active in the default configuration; remove the 503 fallback used by `no-db`.

Encryption remains defense in depth for captured data structures, but it is not a boundary against an attacker who can inspect the running process: the master key is also available to that process.

### D5: Single backend instance and bounded memory budget

The supported deployment has one backend instance. The in-memory share store and existing rate limiter are local to that process, so requests for one share must reach that instance. Keep the existing configurable capacity property and change its default to 268,435,456 bytes (256 MiB); the separate maximum of 1,000 active shares remains. The byte limit measures content payloads, not total JVM heap use, so operators must provision additional heap/container memory for encryption buffers, metadata and application overhead.

**Alternatives:** Sticky routing does not make shares available after process loss and adds deployment complexity. A distributed cache would be a different architecture and is outside this change.

### D6: Remove database build and runtime wiring

Remove Spring Data JPA, the PostgreSQL driver, the H2 test runtime, datasource/JPA properties and the `no-db` profile switch. Remove the PostgreSQL Compose service and `db-data` volume; retain the existing mock, server and portal services. Update persistence-specific tests to exercise the in-memory store and default-profile API instead.

## Risks / Trade-offs

- [Backend restart or crash invalidates every active link] → This is an accepted product behavior; specify it in deployment documentation and tests.
- [A request routed to a different backend instance cannot find the share] → Operate one backend instance; do not scale this service horizontally.
- [Memory pressure or garbage collection pauses with many/large shares] → Default to a 256-MiB content budget, keep the entry limit, and document required heap headroom; retain configurable lower limits.
- [Concurrent state changes could over-deliver or exceed capacity] → Cover per-share retrieval serialization and concurrent capacity admission with focused tests.
- [Old PostgreSQL volume may remain after removing its Compose service] → Do not delete it automatically. Document an explicit, volume-specific cleanup procedure with a data-loss warning.
- [Rollback after deleting the old volume cannot recover its shares] → Keep volume cleanup operator-controlled; a rollback can restore the old database only while its volume still exists.
- [Heap inspection can expose both ciphertext and the master key] → Retaining encryption preserves the existing storage contract but does not claim protection from process-level access; access to runtime memory and the key secret remains operationally sensitive.

## Migration Plan

1. Deploy the new Compose configuration with the single backend instance and the same `SECURE_SHARE_MASTER_KEY`; existing PostgreSQL rows are not imported into memory.
2. Stop/remove any orphaned PostgreSQL container from the old Compose project. The new configuration no longer connects to or mounts the old `db-data` volume.
3. Treat existing shares as unavailable after moving to the new version. Leave the old volume untouched until its owner confirms the contents are disposable.
4. If approved, remove only the identified legacy `db-data` volume using a documented, explicit operator command. Never use a broad volume-prune command as part of this migration.
5. Rollback requires the prior application configuration and the old database volume. Shares created by the in-memory version are unrecoverable after process exit and cannot be migrated back.

## Open Questions

None. The 256-MiB default and acceptance of share loss on process restart are confirmed; single-instance operation follows the current Compose topology and is documented as a constraint.