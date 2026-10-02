export interface IVersionControlService {
  createRepository(name: string): Promise<string>;
  deleteRepository(name: string): Promise<void>;
  pushWorkspace(localPath: string, repoUrl: string, branch: string): Promise<void>;
  setDefaultBranch(name: string, branch: string): Promise<void>;
}
