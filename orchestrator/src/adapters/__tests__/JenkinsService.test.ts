import { JenkinsService } from '../JenkinsService';
import { AppConfig } from '../../core/config';

global.fetch = jest.fn() as jest.Mock;

describe('JenkinsService', () => {
    const mockConfig: AppConfig = {
        LIP4_BASE_REPO_URL: '',
        LIP4_BASE_REPO_BRANCH: 'main',
        HELM_GITOPS_REPO_URL: '',
        HELM_GITOPS_BRANCH: 'main',
        GIT_AUTHOR_NAME: 'test',
        GIT_AUTHOR_EMAIL: 'test',
        BITBUCKET_API_URL: '',
        BITBUCKET_USER: '',
        BITBUCKET_AUTH_TOKEN: '',
        BITBUCKET_PROJECT_KEY: '',
        JENKINS_API_URL: 'http://jenkins.test',
        JENKINS_USER: 'juser',
        JENKINS_AUTH_TOKEN: 'jtoken',
        JENKINS_TEMPLATE_JOB_NAME: '_template'
    };

    let service: JenkinsService;

    beforeEach(() => {
        service = new JenkinsService(mockConfig);
        (global.fetch as jest.Mock).mockClear();
    });

    it('should replace xml remote tag and post to create job', async () => {
        const originalXml = `<project><hudson.plugins.git.UserRemoteConfig><remote>https://old-repo.git</remote></hudson.plugins.git.UserRemoteConfig></project>`;
        
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, text: async () => originalXml }) 
            .mockResolvedValueOnce({ ok: true });

        await service.createPipelineJob('my-folder', 'my-job', 'http://new-repo.git');

        expect(global.fetch).toHaveBeenCalledTimes(2);
        
        expect(global.fetch).toHaveBeenLastCalledWith(
            'http://jenkins.test/job/my-folder/createItem?name=my-job',
            expect.objectContaining({
                method: 'POST',
                body: `<project><hudson.plugins.git.UserRemoteConfig><remote>http://new-repo.git</remote></hudson.plugins.git.UserRemoteConfig></project>`
            })
        );
    });
});
