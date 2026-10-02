import { SagaStep } from "./SagaStep";
import { EventEmitter } from "events";

export const sagaEvents = new EventEmitter();

export class SagaOrchestrator {
    private steps: SagaStep[] = [];
    private executedSteps: SagaStep[] = [];

    constructor(private jobId: string) {}

    addStep(step: SagaStep): void {
        this.steps.push(step);
    }

    async execute(): Promise<void> {
        for (const step of this.steps) {
            try {
                console.log(`[Saga] Executing step: ${step.name}`);
                sagaEvents.emit('status', { jobId: this.jobId, type: 'info', message: `Executing step: ${step.name}` });
                await step.execute();
                this.executedSteps.push(step);
            } catch (error: any) {
                console.error(`[Saga] Error executing step '${step.name}':`, error);
                sagaEvents.emit('status', { jobId: this.jobId, type: 'error', message: `Error executing step '${step.name}': ${error.message}` });
                await this.compensate();
                sagaEvents.emit('status', { jobId: this.jobId, type: 'done', status: 'FAILED' });
                throw error; // Re-throw to inform the caller
            }
        }
        console.log('[Saga] Saga completed successfully.');
        sagaEvents.emit('status', { jobId: this.jobId, type: 'done', status: 'SUCCESS', message: 'Saga completed successfully.' });
    }

    private async compensate(): Promise<void> {
        console.log('[Saga] Starting compensation (Rollback)...');
        sagaEvents.emit('status', { jobId: this.jobId, type: 'warn', message: `Starting compensation (Rollback)...` });
        // Rollback in reverse order (LIFO)
        for (let i = this.executedSteps.length - 1; i >= 0; i--) {
            const step = this.executedSteps[i];
            try {
                console.log(`[Saga] Compensating step: ${step.name}`);
                sagaEvents.emit('status', { jobId: this.jobId, type: 'warn', message: `Compensating step: ${step.name}` });
                await step.compensate();
            } catch (error: any) {
                console.error(`[Saga] FATAL: Failed to compensate step '${step.name}'. DATA CORPSE DETECTED!`, error);
                sagaEvents.emit('status', { jobId: this.jobId, type: 'error', message: `FATAL: Failed to compensate step '${step.name}'. DATA CORPSE DETECTED!` });
            }
        }
        console.log('[Saga] Compensation finished.');
        sagaEvents.emit('status', { jobId: this.jobId, type: 'warn', message: `Compensation finished.` });
    }
}
