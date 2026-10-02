export interface SagaStep {
    name: string;
    execute(): Promise<void>;
    compensate(): Promise<void>;
}
