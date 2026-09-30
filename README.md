# Kubiverse Portal

This project consists of three main components that together form a modern web application:

## Components

### 1. Portal (Frontend)
The `portal` is a modern web interface built with **React**, **TypeScript**, and **Vite**. **Tailwind CSS** and **shadcn/ui** are used for styling and UI components.
- **Accessible at:** `http://localhost:80` (or simply on port 80)

### 2. Server (Backend)
The `server` is the backend of the application, based on **Java 21** and **Spring Boot 3**. It provides REST APIs, contains the core business logic.
- **Accessible at:** `http://localhost:8080`

### 3. Mock
The `mock` is a lightweight server written in **Node.js** and **Express.js**, designed to simulate the ArgoCD APIs. It ensures that the backend (`server`) can be developed and run independently without requiring a real, active ArgoCD cluster or database connection.
- **Accessible at:** `http://localhost:12004`

### 4. Database
A **PostgreSQL** container (`db`) stores Secure Share data. It is only reachable inside the Compose network; data is kept in the `db-data` volume.

---

## Getting Started

The entire project can easily be started via Docker Compose (or Podman Compose). All dependencies and linking are configured in the `docker-compose.yml` located in the root directory.

1. Ensure you are in the **root directory** of the project (`kubiverse-portal`).
2. Create a Secure Share master key once and store it in a local `.env` file (ignored by Git). Compose refuses to start without it:

```bash
echo "SECURE_SHARE_MASTER_KEY=$(openssl rand -base64 32)" >> .env
```

3. Run the following command to build and start all containers (in the background):

```bash
docker-compose up -d --build
```

*(If you are using podman, the equivalent command is `podman compose up -d --build`)*

Once all containers are up and running, you can access the **Portal** in your browser at [http://localhost](http://localhost). The frontend will automatically communicate with the backend (`server`), which in turn will retrieve data from the `mock` server.

---

## Secure Share

Via the **Secure Share** menu item, users can share a text secret (up to 10,000 characters) or a file (up to 10 MB) through a one-time link. Shares expire after 1 hour, 24 hours, 3 days or 7 days, can be limited to a number of downloads (default: 1, "burn after read") and can be protected with an additional password. Content is stored encrypted and deleted automatically. Configuration options are listed in [server/README.md](server/README.md#secure-share).
