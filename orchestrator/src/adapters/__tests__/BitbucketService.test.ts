import { BitbucketService } from '../BitbucketService';
import { AppConfig } from '../../core/config';

// Mock child_process exec
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, opts, callback) => callback(null, { stdout: '', stderr: '' }))
}));

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

describe('BitbucketService', () => {
    const mockConfig: AppConfig = {
        LIP4_BASE_REPO_URL: '',
        LIP4_BASE_REPO_BRANCH: 'main',
        HELM_GITOPS_REPO_URL: '',
        HELM_GITOPS_BRANCH: 'main',
        GIT_AUTHOR_NAME: 'test',
        GIT_AUTHOR_EMAIL: 'test',
        BITBUCKET_API_URL: 'http://bitbucket.test',
        BITBUCKET_USER: 'testuser',
        BITBUCKET_AUTH_TOKEN: 'testtoken',
        BITBUCKET_PROJECT_KEY: 'TESTPROJ',
        JENKINS_API_URL: '',
        JENKINS_USER: '',
        JENKINS_AUTH_TOKEN: '',
        JENKINS_TEMPLATE_JOB_NAME: '_template'
    };

    let service: BitbucketService;

    beforeEach(() => {
        service = new BitbucketService(mockConfig);
        (global.fetch as jest.Mock).mockClear();
    });

    it('should create a repository and return clone url', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                links: {
                    clone: [{ name: 'http', href: 'http://bitbucket.test/scm/TESTPROJ/my-repo.git' }]
                }
            })
        });

        const url = await service.createRepository('my-repo');
        
        expect(url).toBe('http://bitbucket.test/scm/TESTPROJ/my-repo.git');
        expect(global.fetch).toHaveBeenCalledWith(
            'http://bitbucket.test/projects/TESTPROJ/repos',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ name: 'my-repo', scmId: 'git', forkable: true })
            })
        );
    });

    it('should delete a repository', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

        await service.deleteRepository('my-repo');
        
        expect(global.fetch).toHaveBeenCalledWith(
            'http://bitbucket.test/projects/TESTPROJ/repos/my-repo',
            expect.objectContaining({ method: 'DELETE' })
        );
    });
});
