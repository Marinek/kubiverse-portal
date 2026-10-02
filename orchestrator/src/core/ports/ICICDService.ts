export interface ICICDService {
  createFolderIfNotExists(folderName: string): Promise<void>;
  createPipelineJob(folderName: string, jobName: string, repoUrl: string): Promise<void>;
  triggerBuild(folderName: string, jobName: string): Promise<void>;
  deletePipelineJob(folderName: string, jobName: string): Promise<void>;
}
