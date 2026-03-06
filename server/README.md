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
