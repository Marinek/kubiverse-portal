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

---

## Getting Started

The entire project can easily be started via Docker Compose (or Podman Compose). All dependencies and linking are configured in the `docker-compose.yml` located in the root directory.

1. Ensure you are in the **root directory** of the project (`kubiverse-portal`).
2. Run the following command to build and start all containers (in the background):

```bash
docker-compose up -d --build
```

*(If you are using podman, the equivalent command is `podman compose up -d --build`)*

Once all containers are up and running, you can access the **Portal** in your browser at [http://localhost](http://localhost). The frontend will automatically communicate with the backend (`server`), which in turn will retrieve data from the `mock` server.
