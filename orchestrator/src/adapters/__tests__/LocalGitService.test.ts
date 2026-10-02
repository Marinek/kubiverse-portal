import { LocalGitService } from '../LocalGitService';
import { AppConfig } from '../../core/config';

// Mock child_process.exec to simulate git commands
const execMock = jest.fn();
jest.mock('child_process', () => ({
    exec: (cmd: string, opts: any, callback: any) => {
        if (typeof opts === 'function') {
            callback = opts;
            opts = undefined;
        }
        execMock(cmd, opts).then(() => callback(null, { stdout: '' })).catch((e: any) => callback(e));
    }
}));

describe('LocalGitService URL Credential Injection', () => {
    let service: LocalGitService;

    const mockConfig: AppConfig = {
        LIP4_BASE_REPO_URL: '',
        LIP4_BASE_REPO_BRANCH: 'main',
        HELM_GITOPS_REPO_URL: '',
        HELM_GITOPS_BRANCH: 'main',
        GIT_AUTHOR_NAME: 'test',
        GIT_AUTHOR_EMAIL: 'test',
        BITBUCKET_API_URL: 'https://bitbucket.materna.net/rest/api/1.0',
        BITBUCKET_USER: 'test_user',
        BITBUCKET_AUTH_TOKEN: 'super_secret!123',
        BITBUCKET_PROJECT_KEY: '',
        JENKINS_API_URL: '',
        JENKINS_USER: '',
        JENKINS_AUTH_TOKEN: '',
        JENKINS_TEMPLATE_JOB_NAME: '_template'
    };

    beforeEach(() => {
        execMock.mockClear();
        service = new LocalGitService(mockConfig);
    });

    it('should inject credentials into an HTTP URL if the host matches Bitbucket API', async () => {
        execMock.mockImplementation(async () => {});
        
        await service.cloneTemplate('https://bitbucket.materna.net/scm/fms/fms-base-setup-4o.git', '/target');
        
        expect(execMock).toHaveBeenCalledTimes(1);
        const expectedUrl = 'https://test_user:super_secret!123@bitbucket.materna.net/scm/fms/fms-base-setup-4o.git';
        expect(execMock.mock.calls[0][0]).toBe(`git clone "${expectedUrl}" "/target"`);
    });

    it('should NOT inject credentials into an HTTP URL if the host is third-party (e.g. GitHub)', async () => {
        execMock.mockImplementation(async () => {});
        
        // This simulates cloning a public template from GitHub
        await service.cloneTemplate('https://github.com/kubiverse/base-template.git', '/target');
        
        expect(execMock).toHaveBeenCalledTimes(1);
        // Credentials must NOT be injected!
        expect(execMock.mock.calls[0][0]).toBe(`git clone "https://github.com/kubiverse/base-template.git" "/target"`);
    });

    it('should not inject credentials if URL already has them', async () => {
        execMock.mockImplementation(async () => {});
        
        await service.cloneTemplate('https://existing_user:pass@bitbucket.materna.net/repo.git', '/target');
        
        expect(execMock).toHaveBeenCalledTimes(1);
        const expectedUrl = 'https://existing_user:pass@bitbucket.materna.net/repo.git';
        expect(execMock.mock.calls[0][0]).toBe(`git clone "${expectedUrl}" "/target"`);
    });

    it('should bypass credential injection for SSH URLs and leave them untouched', async () => {
        execMock.mockImplementation(async () => {});
        
        await service.cloneTemplate('git@github.com:kubiverse/repo.git', '/target');
        
        expect(execMock).toHaveBeenCalledTimes(1);
        // Should exactly match the input without any errors thrown
        expect(execMock.mock.calls[0][0]).toBe(`git clone "git@github.com:kubiverse/repo.git" "/target"`);
    });
});
