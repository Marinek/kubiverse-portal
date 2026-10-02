import { ProjectInitPayload } from "@kubiverse/shared";

export interface IProjectInitializer {
  initialize(payload: ProjectInitPayload, jobId: string): Promise<void>;
  rollback(payload: ProjectInitPayload): Promise<void>;
}
