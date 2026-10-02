import { ProjectInitPayload } from "@kubiverse/shared";
import { IProjectInitializer } from "../ports/IProjectInitializer";
import { Lip4Initializer } from "../strategies/Lip4Initializer";
import { LocalGitService } from "../../adapters/LocalGitService";
import { HandlebarsTemplateService } from "../../adapters/HandlebarsTemplateService";
import { BitbucketService } from "../../adapters/BitbucketService";
import { JenkinsService } from "../../adapters/JenkinsService";
import { HelmGitOpsService } from "../../adapters/HelmGitOpsService";
import { appConfig } from "../config";

export class ProjectInitializerFactory {
    private static localGitService = new LocalGitService(appConfig);
    private static templateService = new HandlebarsTemplateService();
    private static bitbucketService = new BitbucketService(appConfig);
    private static jenkinsService = new JenkinsService(appConfig);
    private static gitOpsService = new HelmGitOpsService(appConfig, this.templateService);

    static createInitializer(projectType: string): IProjectInitializer {
        switch (projectType) {
            case "LIP_4":
                return new Lip4Initializer(
                    appConfig,
                    this.localGitService,
                    this.templateService,
                    this.bitbucketService,
                    this.jenkinsService,
                    this.gitOpsService
                );
            // case "LIP_5": return new Lip5Initializer(...);
            default:
                throw new Error(`No initializer strategy found for project type: ${projectType}`);
        }
    }
}
