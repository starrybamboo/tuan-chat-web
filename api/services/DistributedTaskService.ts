/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultDistributedTask } from '../models/ApiResultDistributedTask';
import type { ApiResultListDistributedTask } from '../models/ApiResultListDistributedTask';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultTaskStatistics } from '../models/ApiResultTaskStatistics';
import type { TaskCreateRequest } from '../models/TaskCreateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DistributedTaskService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 取消任务
     * @param taskId
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public cancelTask(
        taskId: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/distributed-task/{taskId}/cancel',
            path: {
                'taskId': taskId,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 创建新任务
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public createTask(
        requestBody: TaskCreateRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/distributed-task/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取任务详情
     * @param taskId
     * @returns ApiResultDistributedTask OK
     * @throws ApiError
     */
    public getTask(
        taskId: number,
    ): CancelablePromise<ApiResultDistributedTask> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/distributed-task/{taskId}',
            path: {
                'taskId': taskId,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 按类型获取任务列表
     * @param taskType
     * @returns ApiResultListDistributedTask OK
     * @throws ApiError
     */
    public getTasksByType(
        taskType: string,
    ): CancelablePromise<ApiResultListDistributedTask> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/distributed-task/type/{taskType}',
            path: {
                'taskType': taskType,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取任务统计信息
     * @returns ApiResultTaskStatistics OK
     * @throws ApiError
     */
    public getStatistics(): CancelablePromise<ApiResultTaskStatistics> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/distributed-task/statistics',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取待分配任务列表
     * @returns ApiResultListDistributedTask OK
     * @throws ApiError
     */
    public getPendingTasks(): CancelablePromise<ApiResultListDistributedTask> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/distributed-task/pending',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取失败任务列表
     * @param limit
     * @returns ApiResultListDistributedTask OK
     * @throws ApiError
     */
    public getFailedTasks(
        limit: number = 50,
    ): CancelablePromise<ApiResultListDistributedTask> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/distributed-task/failed',
            query: {
                'limit': limit,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取已完成任务列表
     * @param limit
     * @returns ApiResultListDistributedTask OK
     * @throws ApiError
     */
    public getCompletedTasks(
        limit: number = 50,
    ): CancelablePromise<ApiResultListDistributedTask> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/distributed-task/completed',
            query: {
                'limit': limit,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
