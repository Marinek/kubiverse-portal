import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { ITemplateService } from '../core/ports/ITemplateService';

export class HandlebarsTemplateService implements ITemplateService {
    async processFile(filePath: string, context: Record<string, any>): Promise<void> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const template = Handlebars.compile(content, { noEscape: true });
            const result = template(context);
            await fs.promises.writeFile(filePath, result, 'utf-8');
        } catch (error) {
            console.error(`Failed to process template file: ${filePath}`, error);
            throw error;
        }
    }

    async processDirectory(directoryPath: string, context: Record<string, any>): Promise<void> {
        const files = await this.getFilesRecursively(directoryPath);
        for (const file of files) {
            // Avoid processing binary files or .git (though .git should be removed)
            if (!file.includes('.git/')) {
                await this.processFile(file, context);
            }
        }
    }

    private async getFilesRecursively(dir: string): Promise<string[]> {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(entries.map((entry) => {
            const res = path.resolve(dir, entry.name);
            return entry.isDirectory() ? this.getFilesRecursively(res) : [res];
        }));
        return Array.prototype.concat(...files);
    }
}
