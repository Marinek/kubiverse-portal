import express from 'express';
import projectRoutes from './api/routes/project.routes';

// Allow connections to internal services (e.g. Jenkins/Bitbucket) with self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
app.use(express.json());

app.use('/orchestrator/api/v1/projects', projectRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Orchestrator backend listening on port ${PORT}`);
});
