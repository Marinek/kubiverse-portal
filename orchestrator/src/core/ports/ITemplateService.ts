export interface ITemplateService {
    processFile(filePath: string, context: Record<string, any>): Promise<void>;
    processDirectory(directoryPath: string, context: Record<string, any>): Promise<void>;
}
