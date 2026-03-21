/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultCursorPageBaseResponseNotificationItemResponse } from '../models/ApiResultCursorPageBaseResponseNotificationItemResponse';
import type { ApiResultNotificationUnreadCountResponse } from '../models/ApiResultNotificationUnreadCountResponse';
import type { NotificationPageRequest } from '../models/NotificationPageRequest';
import type { NotificationReadAllRequest } from '../models/NotificationReadAllRequest';
import type { NotificationReadRequest } from '../models/NotificationReadRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class NotificationControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 批量标记通知已读
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public markRead(
        requestBody: NotificationReadRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/notification/read',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 全部标记通知已读
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public markAllRead(
        requestBody?: NotificationReadAllRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/notification/read-all',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 分页获取通知列表
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponseNotificationItemResponse OK
     * @throws ApiError
     */
    public pageNotifications(
        requestBody: NotificationPageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseNotificationItemResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/notification/page',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取通知未读数
     * @returns ApiResultNotificationUnreadCountResponse OK
     * @throws ApiError
     */
    public getUnreadCount(): CancelablePromise<ApiResultNotificationUnreadCountResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/notification/unread/count',
        });
    }
}
