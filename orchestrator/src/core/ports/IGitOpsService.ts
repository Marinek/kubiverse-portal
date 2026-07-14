import { ProjectInitPayload } from "@kubiverse/shared";

export interface IGitOpsService {
  cloneRegistry(): Promise<string>;
  commitAndPush(localPath: string, payload: ProjectInitPayload): Promise<void>;
  rollbackCommit(localPath: string, projectName: string): Promise<void>;
}
