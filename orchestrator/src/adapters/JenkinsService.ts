import { ICICDService } from '../core/ports/ICICDService';
import { AppConfig } from '../core/config';

export class JenkinsService implements ICICDService {
    constructor(private config: AppConfig) { }

    private getHeaders() {
        const { JENKINS_USER, JENKINS_AUTH_TOKEN } = this.config;
        return {
            'Authorization': `Basic ${Buffer.from(`${JENKINS_USER}:${JENKINS_AUTH_TOKEN}`).toString('base64')}`,
        };
    }

    async createFolderIfNotExists(folderName: string): Promise<void> {
        const { JENKINS_API_URL } = this.config;
        const headers = this.getHeaders();

        console.log(`[Jenkins] Checking if folder exists: ${folderName}`);
        const checkRes = await fetch(`${JENKINS_API_URL}/job/${folderName}/api/json`, { headers });

        if (checkRes.status === 404) {
            console.log(`[Jenkins] Folder missing. Creating folder: ${folderName}`);
            const formData = new URLSearchParams();
            formData.append('name', folderName);
            formData.append('mode', 'com.cloudbees.hudson.plugins.folder.Folder');

            const createRes = await fetch(`${JENKINS_API_URL}/createItem`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (!createRes.ok) throw new Error(`Failed to create Jenkins folder: ${await createRes.text()}`);
        }
    }

    async createPipelineJob(folderName: string, jobName: string, repoUrl: string): Promise<void> {


        const { JENKINS_API_URL, JENKINS_TEMPLATE_JOB_NAME } = this.config;
        const headers = this.getHeaders();

        console.log(`[Jenkins] Fetching template job XML...`);
        const templateRes = await fetch(`${JENKINS_API_URL}/job/${JENKINS_TEMPLATE_JOB_NAME}/config.xml`, { headers });
        if (!templateRes.ok) throw new Error("Could not fetch Jenkins template XML.");

        let xml = await templateRes.text();

        console.log(`[Jenkins] Injecting Bitbucket Repo details into XML...`);
        // Support for standard Git plugin
        xml = xml.replace(/<remote>.*?<\/remote>/g, `<remote>${repoUrl}</remote>`);
        // Support for Bitbucket Branch Source plugin
        const { BITBUCKET_PROJECT_KEY } = this.config;
        const repoSlug = jobName
            .toLowerCase()
            .replace(/[^a-z0-9_.-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
        xml = xml.replace(/<repoOwner>.*?<\/repoOwner>/g, `<repoOwner>${BITBUCKET_PROJECT_KEY}</repoOwner>`);
        xml = xml.replace(/<repository>.*?<\/repository>/g, `<repository>${repoSlug}</repository>`);
        // Clear the source ID to prevent Jenkins from caching the template's SCM state
        xml = xml.replace(/<source class="com\.cloudbees.*?">[\s\S]*?<id>.*?<\/id>/g, (match) => match.replace(/<id>.*?<\/id>/, '<id></id>'));

        console.log(`[Jenkins] Creating job: ${jobName} in folder: ${folderName}`);
        const createRes = await fetch(`${JENKINS_API_URL}/job/${folderName}/createItem?name=${jobName}`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/xml' },
            body: xml
        });

        if (!createRes.ok) throw new Error(`Failed to create Jenkins job: ${await createRes.text()}`);
    }

    async triggerBuild(folderName: string, jobName: string): Promise<void> {
        const { JENKINS_API_URL } = this.config;
        console.log(`[Jenkins] Triggering initial branch scan for ${folderName}/${jobName}`);
        await fetch(`${JENKINS_API_URL}/job/${folderName}/job/${jobName}/build`, {
            method: 'POST',
            headers: this.getHeaders(),
            redirect: 'manual' // Jenkins returns a 302 to the queue item, often with a malformed URL. We don't need to follow it.
        });
    }

    async deletePipelineJob(folderName: string, jobName: string): Promise<void> {
        const { JENKINS_API_URL } = this.config;
        console.log(`[Jenkins] Rollback: Deleting job ${folderName}/${jobName}`);
        const response = await fetch(`${JENKINS_API_URL}/job/${folderName}/job/${jobName}/doDelete`, {
            method: 'POST',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            console.error(`[Jenkins] Warning: Failed to delete job ${jobName} during rollback.`);
        }
    }
}
