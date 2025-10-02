/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultString } from '../models/ApiResultString';
import type { TaskAssignPushRequest } from '../models/TaskAssignPushRequest';
import type { TaskCancelPushRequest } from '../models/TaskCancelPushRequest';
import type { TaskSubmitHttpRequest } from '../models/TaskSubmitHttpRequest';
import type { VolunteerIdRequest } from '../models/VolunteerIdRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DistributedWsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 模拟志愿者心跳（通过HTTP，以volunteerId定位连接并下发心跳ACK）
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public volunteerHeartbeat(
        requestBody: VolunteerIdRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/distributed-ws/volunteer/heartbeat',
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
     * 提交任务结果（通过HTTP，服务端按WS路径发送确认推送）
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public submitTask(
        requestBody: TaskSubmitHttpRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/distributed-ws/task/submit',
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
     * 模拟志愿者请求任务（通过HTTP触发WS提示）
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public requestTask(
        requestBody: VolunteerIdRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/distributed-ws/task/request',
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
     * 取消志愿者的任务（通过HTTP）
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public cancelTask(
        requestBody: TaskCancelPushRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/distributed-ws/task/cancel',
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
     * 向指定志愿者推送任务分配（通过HTTP）
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public assignTask(
        requestBody: TaskAssignPushRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/distributed-ws/task/assign',
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
}
