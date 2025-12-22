/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 返回对象
 */
export type DistributedTask = {
    taskId?: number;
    taskName?: string;
    taskType?: string;
    inputData?: string;
    status?: DistributedTask.status;
    assignedVolunteerId?: string;
    createTime?: string;
    assignTime?: string;
    completeTime?: string;
    resultData?: string;
    errorMessage?: string;
    executionDuration?: number;
    running?: boolean;
    completed?: boolean;
};
export namespace DistributedTask {
    export enum status {
        PENDING = 'PENDING',
        ASSIGNED = 'ASSIGNED',
        RUNNING = 'RUNNING',
        COMPLETED = 'COMPLETED',
        FAILED = 'FAILED',
        CANCELLED = 'CANCELLED',
    }
}

