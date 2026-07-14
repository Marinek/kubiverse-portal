import { ProjectInitPayload } from "@kubiverse/shared";
import { IProjectInitializer } from "../ports/IProjectInitializer";
import { ILocalGitService } from "../ports/ILocalGitService";
import { ITemplateService } from "../ports/ITemplateService";
import { IVersionControlService } from "../ports/IVersionControlService";
import { ICICDService } from "../ports/ICICDService";
import { IGitOpsService } from "../ports/IGitOpsService";
import { SagaOrchestrator } from "../saga/SagaOrchestrator";
import { getDriverForDBMS, getUrlForDBMS } from "../domain/dbms-mapper";
import { AppConfig } from "../config";
import * as path from 'path';
import * as fs from 'fs';

export class Lip4Initializer implements IProjectInitializer {
    constructor(
        private config: AppConfig,
        private localGitService: ILocalGitService,
        private templateService: ITemplateService,
        private vcsService: IVersionControlService,
        private cicdService: ICICDService,
        private gitOpsService: IGitOpsService
    ) {}

    async initialize(payload: ProjectInitPayload, jobId: string): Promise<void> {
        const orchestrator = new SagaOrchestrator(jobId);
        
        const dbmsDriver = getDriverForDBMS(payload.dbms);
        const jdbcUrl = getUrlForDBMS(payload.dbms, payload.project_name);
        
        const templateContext = {
            ...payload,
            datasource_driver: dbmsDriver,
            datasource_url: jdbcUrl
        };

        const targetDir = path.resolve(process.cwd(), 'tmp_workspaces', payload.project_name);
        const baseRepoUrl = this.config.LIP4_BASE_REPO_URL;

        // Step 1: Clone and Template
        orchestrator.addStep({
            name: 'Clone Base Template & Render',
            execute: async () => {
                await this.localGitService.cloneTemplate(baseRepoUrl, targetDir);
                await this.localGitService.removeGitHistory(targetDir);
                
                const envTemplateSrc = path.resolve(__dirname, '../../templates/env.hbs');
                const jenkinsTemplateSrc = path.resolve(__dirname, '../../templates/Jenkinsfile.hbs');
                
                const projectDir = payload.project_directory || 'project';
                const envDestDir = path.join(targetDir, projectDir);
                await fs.promises.mkdir(envDestDir, { recursive: true });
                
                const envDest = path.join(envDestDir, '.env');
                const jenkinsDest = path.join(targetDir, 'Jenkinsfile');
                
                await fs.promises.copyFile(envTemplateSrc, envDest);
                await fs.promises.copyFile(jenkinsTemplateSrc, jenkinsDest);
                
                await this.templateService.processFile(envDest, templateContext);
                await this.templateService.processFile(jenkinsDest, templateContext);
                await this.localGitService.initGitRepository(targetDir);
            },
            compensate: async () => {
                if (fs.existsSync(targetDir)) {
                    console.log(`[Rollback] Deleting workspace: ${targetDir}`);
                    await fs.promises.rm(targetDir, { recursive: true, force: true });
                }
            }
        });

        // Shared variable for the bitbucket clone URL to pass to Jenkins
        let bitbucketRepoUrl = "";

        // Step 2: Bitbucket Integration
        orchestrator.addStep({
            name: 'Bitbucket Repository Setup',
            execute: async () => {
                bitbucketRepoUrl = await this.vcsService.createRepository(payload.project_name);
                await this.vcsService.pushWorkspace(targetDir, bitbucketRepoUrl, this.config.LIP4_BASE_REPO_BRANCH);
            },
            compensate: async () => {
                await this.vcsService.deleteRepository(payload.project_name);
            }
        });

        // Step 3: Jenkins Integration
        orchestrator.addStep({
            name: 'Jenkins Job Provisioning',
            execute: async () => {
                const folderName = payload.project_customer;
                const jobName = payload.project_name;
                
                await this.cicdService.createFolderIfNotExists(folderName);
                await this.cicdService.createPipelineJob(folderName, jobName, bitbucketRepoUrl);
                await this.cicdService.triggerBuild(folderName, jobName);
            },
            compensate: async () => {
                const folderName = payload.project_customer;
                const jobName = payload.project_name;
                await this.cicdService.deletePipelineJob(folderName, jobName);
            }
        });

        // Step 4: Helm GitOps Integration
        let gitOpsLocalPath = "";
        orchestrator.addStep({
            name: 'Helm GitOps Registry Update',
            execute: async () => {
                gitOpsLocalPath = await this.gitOpsService.cloneRegistry();
                await this.gitOpsService.commitAndPush(gitOpsLocalPath, payload);
            },
            compensate: async () => {
                if (gitOpsLocalPath) {
                    await this.gitOpsService.rollbackCommit(gitOpsLocalPath, payload.project_name);
                }
            }
        });

        await orchestrator.execute();
    }

    async rollback(payload: ProjectInitPayload): Promise<void> {
        // Handled dynamically via SagaOrchestrator
    }
}
