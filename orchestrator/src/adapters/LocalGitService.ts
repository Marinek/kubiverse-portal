import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { ILocalGitService } from '../core/ports/ILocalGitService';
import { AppConfig } from '../core/config';

const execAsync = promisify(exec);

export class LocalGitService implements ILocalGitService {
    constructor(private config: AppConfig) {}

    async cloneTemplate(repoUrl: string, targetPath: string): Promise<void> {
        let finalUrl = repoUrl;
        
        if (repoUrl.startsWith('http://') || repoUrl.startsWith('https://')) {
            const parsedUrl = new URL(repoUrl);
            if (!parsedUrl.username) {
                const { BITBUCKET_USER, BITBUCKET_AUTH_TOKEN, BITBUCKET_API_URL } = this.config;
                
                // Only inject Bitbucket credentials if the target is actually Bitbucket!
                const isBitbucketTarget = BITBUCKET_API_URL && parsedUrl.hostname === new URL(BITBUCKET_API_URL).hostname;
                
                if (isBitbucketTarget && BITBUCKET_USER && BITBUCKET_AUTH_TOKEN) {
                    parsedUrl.username = encodeURIComponent(BITBUCKET_USER);
                    parsedUrl.password = encodeURIComponent(BITBUCKET_AUTH_TOKEN);
                    finalUrl = parsedUrl.toString();
                }
            }
        }

        const logUrl = finalUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
        console.log(`[Git] Cloning ${logUrl} into ${targetPath}`);
        
        await execAsync(`git clone "${finalUrl}" "${targetPath}"`);
    }

    async removeGitHistory(targetPath: string): Promise<void> {
        console.log(`[Git] Removing .git history from ${targetPath}`);
        const gitDir = path.join(targetPath, '.git');
        if (fs.existsSync(gitDir)) {
            await fs.promises.rm(gitDir, { recursive: true, force: true });
        }
    }

    async initGitRepository(targetPath: string): Promise<void> {
        console.log(`[Git] Initializing new git repository in ${targetPath}`);
        await execAsync(`git init`, { cwd: targetPath });
        await execAsync(`git add .`, { cwd: targetPath });
        
        const { GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL } = this.config;
        await execAsync(`git -c user.name="${GIT_AUTHOR_NAME}" -c user.email="${GIT_AUTHOR_EMAIL}" commit -m "Initial commit from Kubiverse Portal template"`, { cwd: targetPath });
    }
}
