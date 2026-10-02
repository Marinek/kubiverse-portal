import { HelmGitOpsService } from '../HelmGitOpsService';
import { ITemplateService } from '../../core/ports/ITemplateService';
import { AppConfig } from '../../core/config';

// Mock fs to avoid hitting real disk
jest.mock('fs', () => ({
    existsSync: jest.fn(() => true),
    promises: {
        mkdir: jest.fn(),
        copyFile: jest.fn(),
        rm: jest.fn()
    }
}));

const execMock = jest.fn();
// Mock child_process.exec to simulate git commands
jest.mock('child_process', () => ({
    exec: (cmd: string, opts: any, callback: any) => {
        if (typeof opts === 'function') {
            callback = opts;
            opts = undefined;
        }
        execMock(cmd, opts).then(() => callback(null, { stdout: '' })).catch((e: any) => callback(e));
    }
}));

describe('HelmGitOpsService Retry Logic', () => {
    let service: HelmGitOpsService;
    let mockTemplateService: ITemplateService;

    const mockConfig: AppConfig = {
        LIP4_BASE_REPO_URL: '',
        LIP4_BASE_REPO_BRANCH: 'main',
        HELM_GITOPS_REPO_URL: 'http://gitops',
        HELM_GITOPS_BRANCH: 'main',
        GIT_AUTHOR_NAME: 'test',
        GIT_AUTHOR_EMAIL: 'test',
        BITBUCKET_API_URL: '',
        BITBUCKET_USER: '',
        BITBUCKET_AUTH_TOKEN: '',
        BITBUCKET_PROJECT_KEY: '',
        JENKINS_API_URL: '',
        JENKINS_USER: '',
        JENKINS_AUTH_TOKEN: '',
        JENKINS_TEMPLATE_JOB_NAME: '_template'
    };

    beforeEach(() => {
        execMock.mockClear();
        mockTemplateService = { processDirectory: jest.fn(), processFile: jest.fn() };
        service = new HelmGitOpsService(mockConfig, mockTemplateService);
    });

    it('should retry push if the first push fails (simulate race condition)', async () => {
        execMock.mockImplementation(async (cmd: string) => {
            // Count how many 'git push' commands have been attempted
            const pushCalls = execMock.mock.calls.filter(call => call[0].includes('git push origin main'));
            
            // Make it fail exactly on the very first git push attempt
            if (cmd.includes('git push origin main') && pushCalls.length === 1) {
                throw new Error("Push failed: fetch first"); 
            }
            return; // Everything else succeeds (clone, add, commit, rebase, 2nd push)
        });

        const payload = { project_type: 'LIP_4', dbms: 'postgres', project_name: 'test-project', project_customer: 'test-customer', deployment: 'deploy', deployment_name: 'test' };

        const localPath = await service.cloneRegistry();
        await service.commitAndPush(localPath, payload as any);

        const pushCalls = execMock.mock.calls.filter(call => call[0].includes('git push origin main'));
        const pullCalls = execMock.mock.calls.filter(call => call[0].includes('git pull --rebase origin main'));

        // Assert that the retry loop functioned perfectly
        expect(pushCalls.length).toBe(2); // Attempted push twice
        expect(pullCalls.length).toBe(1); // Caught error and pulled (rebased) once between attempts
    });
});
