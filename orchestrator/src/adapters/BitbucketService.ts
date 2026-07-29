import { IVersionControlService } from '../core/ports/IVersionControlService';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AppConfig } from '../core/config';

const execAsync = promisify(exec);

export class BitbucketService implements IVersionControlService {
    constructor(private config: AppConfig) {}

    async createRepository(name: string): Promise<string> {
        const { BITBUCKET_API_URL, BITBUCKET_USER, BITBUCKET_AUTH_TOKEN, BITBUCKET_PROJECT_KEY } = this.config;

        console.log(`[Bitbucket] Creating repository: ${name} in project ${BITBUCKET_PROJECT_KEY}`);
        const auth = Buffer.from(`${BITBUCKET_USER}:${BITBUCKET_AUTH_TOKEN}`).toString('base64');
        
        // Use Bitbucket Server API route
        const response = await fetch(`${BITBUCKET_API_URL}/projects/${BITBUCKET_PROJECT_KEY}/repos`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                scmId: "git",
                forkable: true
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Failed to create Bitbucket repo: ${err}`);
        }

        const data = await response.json();
        return data.links?.clone?.find((l: any) => l.name === 'http')?.href || `${BITBUCKET_API_URL.replace('/rest/api/1.0', '')}/scm/${BITBUCKET_PROJECT_KEY.toLowerCase()}/${name}.git`;
    }

    async deleteRepository(name: string): Promise<void> {
        const { BITBUCKET_API_URL, BITBUCKET_USER, BITBUCKET_AUTH_TOKEN, BITBUCKET_PROJECT_KEY } = this.config;

        console.log(`[Bitbucket] Rollback: Deleting repository: ${name}`);
        const auth = Buffer.from(`${BITBUCKET_USER}:${BITBUCKET_AUTH_TOKEN}`).toString('base64');
        
        const response = await fetch(`${BITBUCKET_API_URL}/projects/${BITBUCKET_PROJECT_KEY}/repos/${name}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (!response.ok) {
            console.error(`[Bitbucket] Warning: Failed to delete repo ${name} during rollback.`);
        }
    }

    async pushWorkspace(localPath: string, repoUrl: string, branch: string = 'main'): Promise<void> {
        console.log(`[Bitbucket] Pushing workspace ${localPath} to ${repoUrl} on branch ${branch}`);
        
        const { BITBUCKET_USER, BITBUCKET_AUTH_TOKEN } = this.config;
        
        const encodedUser = encodeURIComponent(BITBUCKET_USER);
        const encodedToken = encodeURIComponent(BITBUCKET_AUTH_TOKEN);
        const authUrl = repoUrl
            .replace('https://', `https://${encodedUser}:${encodedToken}@`)
            .replace('http://', `http://${encodedUser}:${encodedToken}@`);
        
        await execAsync(`git remote add origin "${authUrl}"`, { cwd: localPath });
        await execAsync(`git branch -M ${branch}`, { cwd: localPath });
        await execAsync(`git push -u origin ${branch}`, { cwd: localPath });
        await execAsync(`git remote remove origin`, { cwd: localPath });
    }

    async setDefaultBranch(name: string, branch: string): Promise<void> {
        const { BITBUCKET_API_URL, BITBUCKET_USER, BITBUCKET_AUTH_TOKEN, BITBUCKET_PROJECT_KEY } = this.config;
        console.log(`[Bitbucket] Setting default branch for ${name} to ${branch}`);
        
        const auth = Buffer.from(`${BITBUCKET_USER}:${BITBUCKET_AUTH_TOKEN}`).toString('base64');
        const response = await fetch(`${BITBUCKET_API_URL}/projects/${BITBUCKET_PROJECT_KEY}/repos/${name}/branches/default`, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: `refs/heads/${branch}` })
        });

        if (!response.ok) {
            console.error(`[Bitbucket] Warning: Failed to set default branch to ${branch}: ${await response.text()}`);
        }
    }
}
