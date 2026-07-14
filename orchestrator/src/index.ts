import express from 'express';
import projectRoutes from './api/routes/project.routes';

const app = express();
app.use(express.json());

app.use('/api/v1/projects', projectRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Orchestrator backend listening on port ${PORT}`);
});
