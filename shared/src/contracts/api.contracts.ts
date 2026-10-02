export interface ProjectInitResponse {
  jobId: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  currentStep?: string;
  error?: string;
}
