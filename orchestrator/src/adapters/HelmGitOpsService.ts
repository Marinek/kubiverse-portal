import { IGitOpsService } from '../core/ports/IGitOpsService';
import { ITemplateService } from '../core/ports/ITemplateService';
import { AppConfig } from '../core/config';
import { ProjectInitPayload } from '@kubiverse/shared';
import { getDriverForDBMS, getUrlForDBMS } from '../core/domain/dbms-mapper';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export class HelmGitOpsService implements IGitOpsService {
    constructor(
        private config: AppConfig,
        private templateService: ITemplateService
    ) {}

    // Pull-Rebase-Push Retry Mechanism (Spec Chapter 9.1)
    private async retryPush(localPath: string, commitMessage: string, maxRetries = 3): Promise<void> {
        await execAsync(`git add .`, { cwd: localPath });
        
        try {
            await execAsync(`git commit -m "${commitMessage}"`, { cwd: localPath });
        } catch (e: any) {
            if (e.stdout?.includes('nothing to commit')) return;
            throw e;
        }

        for (let i = 0; i < maxRetries; i++) {
            try {
                await execAsync(`git push origin ${this.config.HELM_GITOPS_BRANCH}`, { cwd: localPath });
                console.log(`[GitOps] Push successful on attempt ${i + 1}`);
                return;
            } catch (error: any) {
                console.warn(`[GitOps] Push failed (attempt ${i + 1}/${maxRetries}). Pulling with rebase to resolve race condition...`);
                if (i === maxRetries - 1) {
                    throw new Error(`[GitOps] Failed to push after ${maxRetries} attempts. Last error: ${error.message}`);
                }
                
                try {
                    await execAsync(`git pull --rebase origin ${this.config.HELM_GITOPS_BRANCH}`, { cwd: localPath });
                } catch (rebaseError: any) {
                    throw new Error(`[GitOps] Rebase conflict during retry loop: ${rebaseError.message}`);
                }
            }
        }
    }

    async cloneRegistry(): Promise<string> {
        let repoUrl = this.config.HELM_GITOPS_REPO_URL;
        const { BITBUCKET_USER, BITBUCKET_AUTH_TOKEN } = this.config;
        
        const encodedUser = encodeURIComponent(BITBUCKET_USER);
        const encodedToken = encodeURIComponent(BITBUCKET_AUTH_TOKEN);
        repoUrl = repoUrl
            .replace('https://', `https://${encodedUser}:${encodedToken}@`)
            .replace('http://', `http://${encodedUser}:${encodedToken}@`);

        const localPath = path.resolve(process.cwd(), 'tmp_workspaces', `gitops_${Date.now()}_${Math.random().toString(36).substring(7)}`);
        
        const logUrl = repoUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
        console.log(`[GitOps] Cloning GitOps Registry from ${logUrl} to ${localPath}`);
        await execAsync(`git clone "${repoUrl}" "${localPath}"`);
        
        // Set git configs dynamically from centralized AppConfig
        await execAsync(`git config user.email "${this.config.GIT_AUTHOR_EMAIL}"`, { cwd: localPath });
        await execAsync(`git config user.name "${this.config.GIT_AUTHOR_NAME}"`, { cwd: localPath });

        return localPath;
    }

    async commitAndPush(localPath: string, payload: ProjectInitPayload): Promise<void> {
        console.log(`[GitOps] Generating Helm values for project ${payload.project_name}`);
        
        const projectDir = path.join(localPath, 'projects', payload.project_name).toLowerCase();
        await fs.promises.mkdir(projectDir, { recursive: true });

        // Copy the external template
        const templateSrc = path.resolve(__dirname, '../templates/values.yaml.hbs');
        const templateDest = path.join(projectDir, 'values.yaml');
        await fs.promises.copyFile(templateSrc, templateDest);

        // Render the template using the Handlebars service
        const dbmsDriver = getDriverForDBMS(payload.dbms);
        const jdbcUrl = getUrlForDBMS(payload.dbms, payload.project_name);
        
        const templateContext = {
            ...payload,
            datasource_driver: dbmsDriver,
            datasource_url: jdbcUrl
        };
        await this.templateService.processDirectory(projectDir, templateContext);

        console.log(`[GitOps] Committing and pushing ${payload.project_name}`);
        await this.retryPush(localPath, `Add GitOps config for project ${payload.project_name}`);
    }

    async rollbackCommit(localPath: string, projectName: string): Promise<void> {
        console.log(`[GitOps] Rollback: Deleting GitOps config for ${projectName}`);
        
        const projectDir = path.join(localPath, 'projects', projectName);
        if (fs.existsSync(projectDir)) {
            await fs.promises.rm(projectDir, { recursive: true, force: true });
            await this.retryPush(localPath, `Rollback GitOps config for project ${projectName}`);
        }
    }
}
