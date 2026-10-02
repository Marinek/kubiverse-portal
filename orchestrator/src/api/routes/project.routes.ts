import { Router } from 'express';
import { ProjectInitSchema } from '@kubiverse/shared';
import { ProjectInitializerFactory } from '../../core/factories/ProjectInitializerFactory';
import { sagaEvents } from '../../core/saga/SagaOrchestrator';

const router = Router();

router.post('/init', (req, res) => {
  const result = ProjectInitSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors });
  }

  const payload = result.data;
  const jobId = Math.random().toString(36).substring(7);
  
  // Async background execution
  (async () => {
    try {
      console.log(`[Job ${jobId}] Started for project type: ${payload.project_type}`);
      const initializer = ProjectInitializerFactory.createInitializer(payload.project_type);
      await initializer.initialize(payload, jobId);
      console.log(`[Job ${jobId}] Completed successfully.`);
    } catch (error) {
      console.error(`[Job ${jobId}] Failed.`, error);
    }
  })();
  
  return res.json({ jobId });
});


router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send an initial connected message
  res.write(`data: ${JSON.stringify({ type: 'info', message: 'Connected to Job Stream' })}\n\n`);

  const listener = (data: any) => {
    if (data.jobId === jobId) {
       res.write(`data: ${JSON.stringify(data)}\n\n`);
       if (data.type === 'done') {
           // We could end the response here, but standard SSE stays open or the client closes it
       }
    }
  }
  
  sagaEvents.on('status', listener);
  
  req.on('close', () => {
      sagaEvents.off('status', listener);
  });
});

export default router;
