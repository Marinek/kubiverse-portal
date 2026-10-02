import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load .env if present
dotenv.config();

const ConfigSchema = z.object({
  LIP4_BASE_REPO_URL: z.string().default('https://github.com/dummy/base-repo.git'),
  LIP4_BASE_REPO_BRANCH: z.string().default('main'),
  HELM_GITOPS_REPO_URL: z.string().default('https://github.com/dummy/gitops-repo.git'),
  HELM_GITOPS_BRANCH: z.string().default('main'),
  GIT_AUTHOR_NAME: z.string().default('Kubiverse Bot'),
  GIT_AUTHOR_EMAIL: z.string().default('bot@kubiverse.local'),
  
  // Bitbucket Credentials & Config
  BITBUCKET_API_URL: z.string().default('http://localhost:7990/rest/api/1.0'),
  BITBUCKET_USER: z.string().default('admin'),
  BITBUCKET_AUTH_TOKEN: z.string().default('token'),
  BITBUCKET_PROJECT_KEY: z.string().default('SHARED'),
  
  // Jenkins Credentials & Config
  JENKINS_API_URL: z.string().default('http://localhost:8080'),
  JENKINS_USER: z.string().default('admin'),
  JENKINS_AUTH_TOKEN: z.string().default('token'),
  JENKINS_TEMPLATE_JOB_NAME: z.string().default('_template'),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

// Parse environment variables immediately on startup to ensure fail-fast behavior
export const appConfig = ConfigSchema.parse(process.env);
