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
                summary: { externalURLs: [] }
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

app.listen(PORT, () => {
    console.log(`ArgoCD Mock Server running on http://localhost:${PORT}`);
});
