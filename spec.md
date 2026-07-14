# Specification: Automated Project Initialization Feature

## 1. Overview & Objective
The goal of this feature is to automate the initialization of new projects from the Kubernetes cluster frontpage. Currently, the "Projekt deployen" button is a stub. Clicking this button must open a dynamic wizard/form where users can configure and trigger the creation of a new project environment (repositories, pipelines, and Kubernetes deployment configuration).

The architecture is highly abstract, adopting a **Strategy and Adapter pattern**, to support multiple project types and technology stacks in the future. The first supported type is **"Lip 4"**.

---

## 2. Tech Stack & Architecture
* **Frontend:** React, TypeScript
* **Backend:** TypeScript (Node.js/Express or similar execution environment)
* **Validation Rulebook:** Zod (using Discriminated Unions and Transformers to share schemas and default calculation logic between Frontend and Backend)
* **Templating Engine:** Handlebars (used by the Backend to replace placeholders in files)
* **Core Architecture Patterns:**
  * **Hexagonal Architecture / Adapters:** External systems are abstracted behind interfaces (e.g., `IVersionControlService`, `ICICDService`, `IGitOpsService`). This allows swapping technologies (e.g., migrating from Jenkins to GitLab CI) without changing the core business logic.
  * **Strategy Pattern:** An `IProjectInitializer` interface is used to handle the specific orchestration sequence for different project types.

---

## 3. General Functional Requirements

### 3.1 Frontend (React UI)
1.  **Trigger:** User clicks the "Projekt initialisieren" button on the frontpage.
2.  **Project Type Selection:** A dropdown or selection interface allows the user to choose the project type (initially only "Lip 4").
3.  **Dynamic Form Generation:** Based on the selected project type, a dynamic form is rendered with specific parameters.
4.  **Client-Side Validation:** The form inputs are validated in real-time using the shared **Zod schema**.
5.  **Payload Processing, Submission & Async Feedback:**
    * Submits the validated payload as JSON via POST request to the Backend. The Zod schema automatically applies the correct fallbacks before submission.
    * Enters a loading state and polls a status endpoint (or connects via Server-Sent Events/WebSockets) to display real-time feedback (e.g., *"Creating repository...", "Triggering pipeline..."*) until the process completes.

### 3.2 Backend Processing Pipeline (Orchestrator)
The Backend acts as a generic orchestrator. When receiving a validated JSON payload:

1.  **Job Initialization:** Creates an async background job and returns a `jobId` to the Frontend immediately.
2.  **Strategy Resolution:** Uses a Factory pattern to instantiate the correct `IProjectInitializer` based on the `project_type` payload field.
3.  **Execution Steps (Generic Flow):**
    * **Setup:** Clone the base template defined in the configuration.
    * **Templating:** Process required files via Handlebars.
    * **VCS Integration:** Push to the Version Control provider (via `IVersionControlService`).
    * **CI/CD Integration:** Setup and trigger the pipeline (via `ICICDService`).
    * **GitOps Integration:** Update the GitOps registry (via `IGitOpsService`).
4.  **Error Handling & Rollbacks (Saga Pattern):** 
    * If a step fails (e.g., Jenkins API is unreachable after the Bitbucket repo was already created), the orchestrator triggers a compensating transaction (Rollback) via the Adapters (e.g., `versionControlService.deleteRepo(...)`) to prevent orphaned resources and "data corpses".

---

## 4. Project Type Configuration: "Lip 4"

### 4.1 Data Model & Validation Rules

| Field Name | Type | Required? | Default / Fallback Logic | Description |
| :--- | :--- | :--- | :--- | :--- |
| `project_name` | String | **Yes** | - | Free text. Used for namespacing and `.env`. |
| `project_customer` | String | **Yes** | - | Free text. Jenkins folder hierarchy. |
| `dbms` | Enum | **Yes** | - | Allowed: `oracle`, `mysql`, `mariadb`, `postgres`. |
| `project_directory`| String | No | `"project"` | Target dir for `.env`. |
| `deployment` | Enum | No | `"none"` | Allowed: `none`, `deploy`. |
| `deployment_name` | String | Cond. | - | **Required** if `deployment` == `"deploy"`. |
| `build_image_name` | String | No | `deployment_name` OR `project_name` | Free text. Falls back to `deployment_name`. If that is empty, falls back to `project_name`. |
| `notification_failure_email` | String | No | - | Valid email address for Jenkins alerts. |

**Zod Schema Implementation (using Discriminated Union & Transform for Fallbacks):**
```typescript
import { z } from "zod";

const Lip4Schema = z.object({
  project_type: z.literal("LIP_4"),
  project_name: z.string().min(1),
  project_customer: z.string().min(1),
  dbms: z.enum(["oracle", "mysql", "mariadb", "postgres"]),
  project_directory: z.string().default("project"),
  deployment: z.enum(["none", "deploy"]).default("none"),
  deployment_name: z.string().optional(),
  build_image_name: z.string().optional(),
  notification_failure_email: z.string().email().optional()
})
.refine((data) => {
    // conditional logic: deployment_name is required if deployment == 'deploy'
    if (data.deployment === 'deploy' && !data.deployment_name) {
        return false;
    }
    return true;
}, {
    message: "deployment_name is required when deployment is 'deploy'",
    path: ["deployment_name"]
})
.transform((data) => {
    // Centralized fallback logic for build_image_name. 
    // Acts as single source of truth for Frontend submission and Backend parsing.
    return {
        ...data,
        build_image_name: data.build_image_name || data.deployment_name || data.project_name
    };
});

// Future setup: const ProjectInitSchema = z.discriminatedUnion("project_type", [Lip4Schema, FutureSchema]);
```

### 4.2 Specific Orchestration (Lip4Initializer)
When `project_type === "LIP_4"`, the strategy executes the following specific steps:

1.  **Base Repository Fetching:** Clones the Lip 4 Base Repository.
2.  **File Modification (In-Place Templating):**
    * Removes the `.git` folder to erase commit history.
    * Reads the central Jenkinsfile.hbs and env.hbs templates from the Backend's internal templates/ directory.
    * Replaces Handlebars placeholders with user inputs.
    * Writes the rendered .env file into the <project_directory>/ and the Jenkinsfile into the root of the cloned workspace.
3.  **Bitbucket Integration (Project Repo):**
    * Creates a brand new repository in the shared Bitbucket Project via API.
    * Runs `git init`, commits the modified template files, and pushes into the new repository.
4.  **Jenkins Integration:**
    * **Folder Verification:** Checks if a Jenkins folder matching `project_customer` already exists.
    * **Folder Creation:** If it does not exist, creates the folder via Jenkins API.
    * **Job Provisioning:** Clones an existing template Multibranch Pipeline job via XML API. Updates the Git URL within the XML to point to the newly created Bitbucket repository.
    * **Job Creation:** POSTs the modified XML into the `project_customer` folder to create the new pipeline job.
    * **Trigger:** Triggers an initial branch scan/build.
5.  **Helm & GitOps Integration (`values.yaml`):**
    * Clones the dedicated Helm Git Repository.
    * Creates a new directory: `/projects/{{project_name}}/`.
    * Generates the `values.yaml` using Handlebars (including DBMS specific logic) and saves it in the new directory.
    * Commits and pushes the changes to the Helm repository.

### 4.3 File Templates & Logic

#### A. `.env` Template
Location: `<project_directory>/.env`
```env
COMPOSE_PROJECT_NAME={{project_name}}
```

#### B. `Jenkinsfile` Configuration Map Template
Location: `/Jenkinsfile` (Root)
```groovy
def config = [
    project_name: "{{project_name}}",
    project_customer: "{{project_customer}}",
    dbms: "{{dbms}}",
    project_directory: "{{project_directory}}",
    deployment_name: "{{deployment_name}}",
    deployment: "{{deployment}}",
    build_image_name: "{{build_image_name}}",
    notification_failure_email_address: "{{notification_failure_email}}"
]
```

#### C. `values.yaml` Template (Helm Git Repo)
*Note: The Backend must compute variables like `{{datasource_driver}}` and `{{datasource_url}}` based on the selected `dbms` enum before compiling the Handlebars template.*

```yaml
global:
  shared:
    appEnv:
      DATASOURCE_DRIVER: "{{datasource_driver}}"
      DATASOURCE_PASS: "materna"
      JAVA_OPTS: "-Xmx1G"
      TOMCAT_PROXY_PORT: "443"
      TOMCAT_SCHEME: "https"
      MAILSERVER_HOST: "mailpit-smtp-svc.{{project_name}}.svc.cluster.local"
      MAILSERVER_PORT: "1025"
    migrationEnv:
      FLYWAY_PASSWORD: "materna"
      FLYWAY_PLACEHOLDER_REPLACEMENT: "true"
      FLYWAY_PLACEHOLDER_PREFIX: "$${"
      FLYWAY_CLEAN_DISABLED: "false"
    migrationSql: []

instances:
  develop:
    image: artifact.materna.net:10046/{{build_image_name}}
    tag: develop
    observeDigest: true
    ingress:
    - service: develop-develop-svc
      host: {{project_name}}.fms-kubiverse.materna.net
      path: /develop
    services:
    - name: develop
      port: 8080
      targetPort: 8080
    probes:
      livenessPath: /develop/service/manage/lip/v1/health/simple
      readinessPath: /develop/service/manage/lip/v1/health/simple
    migration:
      enabled: true
      migrationSql: []
      env:
        FLYWAY_URL: "{{datasource_url}}" 
        FLYWAY_USER: "DEVELOP"
    env:
      DATASOURCE_URL: "{{datasource_url}}"
      DATASOURCE_USER: "DEVELOP"
      LIP_BASE_URL: "https://{{project_name}}.fms-kubiverse.materna.net/develop"
      LIP_CONTEXT_PATH: "develop"
  
  mailpit:
    image: artifact.materna.net:10099/axllent/mailpit
    tag: latest
    observeDigest: false
    containerPort: 8025
    migration:
      enabled: false
    ingress:
    - service: mailpit-gui-svc
      host: {{project_name}}.fms-kubiverse.materna.net
      path: /mailpit
      servicePort: 8025
    services:
    - name: smtp
      port: 1025
      targetPort: 1025
    - name: gui
      port: 8025
      targetPort: 8025
    resources:
      requests:
        cpu: "50m"
        memory: "128Mi"
      limits:
        cpu: "100m"
        memory: "256Mi"
    env:
      MP_WEBROOT: "/mailpit"

{{dbms}}-db:
  enabled: true
```

---

## 5. Environment & Infrastructure Variables
The backend requires access to credentials and infrastructure endpoints. These will be supplied via Environment Variables:
* `LIP4_BASE_REPO_URL`: Base repo for the template (e.g., `https://bitbucket.materna.net/scm/fms/fms-base-setup-4o.git`). *Note: In the new architecture, this should map into the Strategy Config.*
* `HELM_GITOPS_REPO_URL`: The Git repository hosting the values files.
* `BITBUCKET_API_URL`, `BITBUCKET_USER`, `BITBUCKET_AUTH_TOKEN`
* `JENKINS_API_URL`, `JENKINS_USER`, `JENKINS_AUTH_TOKEN`

*(Future-proofing: These raw variables should be parsed into a central configuration object upon backend startup to allow dynamic assignment for different project types).*

**Security Requirement:** In a production Kubernetes environment, sensitive credentials (like `*_AUTH_TOKEN` and `*_USER`) **MUST NOT** be stored in plaintext manifests. They must be managed via **Kubernetes Secrets** (or an external secret management solution like HashiCorp Vault / ExternalSecrets) and injected into the containers as environment variables at runtime.

---

## 6. Manual Setup & Implementation Notes (TODOs)
To ensure the backend logic works as intended, the following manual steps and code-specific implementations are required:

1. **Jenkins Template Job:** A dummy/template Multibranch Pipeline job MUST be manually created in Jenkins. The backend will target this specific job via the Jenkins API to duplicate it, rather than building the complex job XML from scratch.
2. **Hardcoded/Env Repository URLs:** The backend code MUST implement the Git cloning process securely. The `LIP4_BASE_REPO_URL` must be injected via Environment Variables to avoid hardcoding credentials or internal domains directly in the source code.
3. **Values.yaml DBMS Logic & Driver Mapping:** The backend MUST implement a mapper function that translates the Zod `dbms` enum into the exact driver strings and JDBC URLs before passing the context to the Handlebars compiler. 
   
   **Strict Driver Mapping:**
   * `oracle` -> `oracle.jdbc.driver.OracleDriver`
   * `mysql` -> `com.mysql.cj.jdbc.Driver`
   * `mariadb` -> `com.mysql.cj.jdbc.Driver`
   * `postgres` -> `org.postgresql.Driver`
   
   *(Note: No other drivers are permitted or required).*

---

## 7. Implementation Roadmap (Spec-Driven Approach)
This roadmap defines the strict order of execution for developing this feature. The AI Agent / Developer MUST follow these phases sequentially.

### Phase 1: Shared Contracts & Setup
* Initialize shared folder/package for the **Zod Schemas** and derived TypeScript types (using **Discriminated Unions**).
* Implement the exact Zod schema defined in section `4.1` (including `.transform()` fallback logic and `.refine()` logic for conditional fields).
* Define the REST API endpoint contract (e.g., `POST /api/v1/projects/init` returning a `jobId`, and `GET /status/:jobId`) accepting the Zod schema.

### Phase 2: Frontend Implementation (React)
* Create the "Project Initialization" UI Modal/Wizard.
* Integrate `react-hook-form` paired with `@hookform/resolvers/zod` using the shared contract.
* Wire the submit button to the API endpoint and implement the Polling/SSE mechanism for live feedback.

### Phase 3: Backend Core Logic (Templating & Git)
* Setup Node.js orchestrator consuming the shared Zod schema for server-side validation.
* Implement the **Handlebars templating service** (including the DBMS string mapping logic).
* Implement the **Git service** (cloning `LIP4_BASE_REPO_URL`, removing `.git`, templating files, re-initializing git).
* Setup the Strategy interfaces (`IVersionControlService`, `ICICDService`) and Rollback (Saga) logic.

### Phase 4: API Integrations (Bitbucket & Jenkins)
* Implement **Bitbucket API service**: Create new repo, authenticate, and push the local Git workspace, clean up the local workspace after successfull Push.
* Implement **Jenkins API service**: 
  * Check if customer folder exists.
  * Create folder if missing.
  * Fetch template job XML, inject new Bitbucket repo URL, and POST to the folder to create the job.
  * Trigger initial branch index.

### Phase 5: GitOps Integration (Helm)
* Implement the Helm GitOps service: Clone `HELM_GITOPS_REPO_URL`.
* Create folder `projects/{{project_name}}`, generate and write `values.yaml`.
* Commit and push changes back to the GitOps repository.

### Phase 6: End-to-End Testing
* Trigger a full creation flow via the React UI and verify all Bitbucket repos, Jenkins jobs, and GitOps commits are successfully generated.
* Simulate forced errors to test the Saga rollback behavior.

---

## 8. Deployment & Local Development

### 8.1 Production Deployment (Kubernetes)
*   The Frontend (React) and Backend (Node.js) will be deployed as containerized applications within the existing Kubernetes cluster.
*   Appropriate Dockerfiles and Kubernetes resources (Deployment, Service, Ingress) or a dedicated Helm Chart must be created for both components.
*   **Secrets Management:** Kubernetes Secrets must be utilized for injecting sensitive environment variables (API tokens, passwords). Plaintext environment variables in Deployment manifests are strictly prohibited for credentials.
*   The Backend must be configured to function seamlessly behind the Ingress controller, ensuring that asynchronous connections (e.g., WebSockets/Server-Sent Events) can be kept open.

### 8.2 Local Development & Testing (Docker Compose)
*   To ensure smooth local development, the entire infrastructure must be bootable locally via Docker (e.g., via `docker-compose.yml`).
*   **App Containers:** Frontend and Backend run locally as containers (with hot-reloading for development).
*   **Infrastructure Mocks:** Since real systems like Bitbucket or the production Jenkins are often unreachable for local tests or too risky for test automation, local equivalents must be provided as Docker containers:
    *   *Git Server:* A local Git server (e.g., Gitea or GitLab CE) to simulate the Bitbucket API (creating repositories). *(Note: The project benefits from the Hexagonal Architecture defined in Section 2, as a Gitea adapter could simply be loaded instead of the Bitbucket adapter for local tests).*
    *   *CI/CD:* A local Jenkins instance as a container, configured with the necessary plugins and a dummy template job.
*   The `.env` concept defined in Section 5 is used to redirect the environment variables (`JENKINS_API_URL`, `BITBUCKET_API_URL`, etc.) in the local environment to the local Docker containers.

---

## 9. Known Edge Cases, Limitations & Technical Outlook
While the MVP architecture is robust, the following edge cases and technical debts are explicitly acknowledged and should be addressed in future iterations:

### 9.1 GitOps Push Race Conditions (Helm Repository)
* **Risk:** If two users initialize a project almost simultaneously, both instances might clone the same state of the Helm GitOps repository, add their folders, and attempt to push. The second push will be rejected by the Git server (non-fast-forward).
* **Technical Outlook:** The `IGitOpsService` adapter must implement a robust **Pull-Rebase-Push loop** with a retry mechanism. Alternatively, write operations to the central GitOps repository must be serialized via a queue.

### 9.2 Job Pipeline State & Resilience
* **Risk:** The orchestrator runs async background jobs. If the Node.js backend pod restarts (e.g., due to a Kubernetes node drain or crash) in the middle of a multi-step execution (e.g., right after cloning the Jenkins job), the internal state is lost. The frontend will poll indefinitely, and the pipeline remains incomplete.
* **Technical Outlook:** For the MVP, jobs run in-memory. In subsequent phases, a persistence layer (e.g., Redis or a lightweight database) must be introduced to save job states, allowing interrupted sagas to resume or cleanly rollback upon backend restart.

### 9.3 Saga Rollback Failures ("Data Corpses")
* **Risk:** The Saga pattern initiates a rollback if a step fails. However, if a rollback step itself fails (e.g., Bitbucket is down precisely when the orchestrator attempts to delete the newly created repo), orphaned resources ("data corpses") will remain.
* **Technical Outlook:** A "Dead-Letter" logging mechanism or alerting system (e.g., email to admins) must be implemented to notify the team of failed rollbacks, ensuring manual cleanup can be performed.

### 9.4 Jenkins XML API vs. Programmable Jobs
* **Risk:** Duplicating Multibranch Pipelines via the Jenkins `config.xml` REST API is pragmatic but fragile, as plugin updates or Jenkins upgrades might alter the XML structure unexpectedly. Due to the constraint of having only one shared Bitbucket Project, this XML cloning approach is currently required to provision individual Multibranch Pipelines for specific repositories within customer folders.
* **Technical Outlook:** The MVP uses the XML approach. Long-term, if the constraints allow, the `ICICDService` adapter could be migrated to use **Jenkins Job DSL** to script the creation of jobs programmatically instead of manually injecting values into XML strings.
