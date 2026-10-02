export interface ILocalGitService {
    cloneTemplate(repoUrl: string, targetPath: string): Promise<void>;
    removeGitHistory(targetPath: string): Promise<void>;
    initGitRepository(targetPath: string): Promise<void>;
}
