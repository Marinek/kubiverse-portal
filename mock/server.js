const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 12004;

app.use(cors());
app.use(express.json());

// Mock Data for ArgoCD Applications
const mockApplications = {
    items: [
        {
            metadata: { name: "kubiverse-frontend", namespace: "argocd", uid: "uid-1" },
            spec: { project: "kubiverse" },
            status: {
                health: { status: "Healthy", message: "Successfully synced" },
                sync: { status: "Synced", revision: "abc1234" },
                summary: { externalURLs: ["https://frontend.kubiverse.internal", "https://app.kubiverse.internal"] }
            }
        },
        {
            metadata: { name: "kubiverse-backend", namespace: "argocd", uid: "uid-2" },
            spec: { project: "kubiverse" },
            status: {
                health: { status: "Healthy", message: "Running" },
                sync: { status: "Synced", revision: "def5678" },
                summary: { externalURLs: ["https://api.kubiverse.internal"] }
            }
        },
        {
            metadata: { name: "payment-service", namespace: "argocd", uid: "uid-3" },
            spec: { project: "finance" },
            status: {
                health: { status: "Degraded", message: "Failing probes" },
                sync: { status: "OutOfSync", revision: "ghi9012" },
                summary: { externalURLs: ["https://payments.finance.internal", "https://checkout.finance.internal"] }
            }
        },
        {
            metadata: { name: "billing-ui", namespace: "argocd", uid: "uid-4" },
            spec: { project: "finance" },
            status: {
                health: { status: "Healthy", message: "OK" },
                sync: { status: "Synced", revision: "jkl3456" },
                summary: { externalURLs: ["https://billing.finance.internal"] }
            }
        },
        {
            metadata: { name: "legacy-app", namespace: "argocd", uid: "uid-5" },
            spec: { project: "default" },
            status: {
                health: { status: "Suspended", message: "Scaled to 0" },
                sync: { status: "Synced", revision: "mno7890" },
                summary: { externalURLs: ["https://legacy.kubiverse.internal/api/"] }
            }
        },
        {
            metadata: { name: "mail-server", namespace: "argocd", uid: "uid-6" },
            spec: { project: "default" },
            status: {
                health: { status: "Healthy", message: "Running" },
                sync: { status: "Synced", revision: "pqrs123" },
                summary: { externalURLs: ["https://mailpit.kubiverse.internal"] }
            }
        }
    ]
};

// ArgoCD Applications Endpoint
app.get('/api/v1/applications', (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/v1/applications - Serving ${mockApplications.items.length} applications`);

    // Simulate network delay
    setTimeout(() => {
        res.json(mockApplications);
    }, 500);
});

// Bitbucket Server API Mock
app.post('/rest/api/1.0/projects/:projectKey/repos', (req, res) => {
    const projectKey = req.params.projectKey;
    const repoName = req.body.name;
    const repoSlug = repoName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    console.log(`[${new Date().toISOString()}] POST /rest/api/1.0/projects/${projectKey}/repos - Creating repo ${repoName}`);

    const response = {
        slug: repoSlug,
        id: Math.floor(Math.random() * 1000),
        name: repoName,
        scmId: "git",
        state: "AVAILABLE",
        statusMessage: "Available",
        forkable: true,
        project: {
            key: projectKey,
            id: 1,
            name: projectKey,
            public: false,
            type: "NORMAL"
        },
        public: false,
        links: {
            clone: [
                {
                    href: `http://${req.get('host')}/scm/${projectKey.toLowerCase()}/${repoSlug}.git`,
                    name: "http"
                },
                {
                    href: `ssh://git@${req.hostname || 'localhost'}:7992/${projectKey.toLowerCase()}/${repoSlug}.git`,
                    name: "ssh"
                }
            ],
            self: [
                {
                    href: `http://${req.get('host')}/projects/${projectKey}/repos/${repoSlug}/browse`
                }
            ]
        }
    };

    setTimeout(() => {
        res.status(201).json(response);
    }, 500);
});

app.listen(PORT, () => {
    console.log(`ArgoCD Mock Server running on http://localhost:${PORT}`);
});
