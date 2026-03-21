/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultCursorPageBaseResponseFeedbackIssueListItemResponse } from '../models/ApiResultCursorPageBaseResponseFeedbackIssueListItemResponse';
import type { ApiResultFeedbackIssueDetailResponse } from '../models/ApiResultFeedbackIssueDetailResponse';
import type { FeedbackIssueArchiveRequest } from '../models/FeedbackIssueArchiveRequest';
import type { FeedbackIssueCreateRequest } from '../models/FeedbackIssueCreateRequest';
import type { FeedbackIssuePageRequest } from '../models/FeedbackIssuePageRequest';
import type { FeedbackIssueStatusUpdateRequest } from '../models/FeedbackIssueStatusUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class FeedbackIssueControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新反馈 Issue 状态
     * @param requestBody
     * @returns ApiResultFeedbackIssueDetailResponse OK
     * @throws ApiError
     */
    public updateStatus(
        requestBody: FeedbackIssueStatusUpdateRequest,
    ): CancelablePromise<ApiResultFeedbackIssueDetailResponse> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/feedback/issue/status',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 更新反馈 Issue 归档状态
     * @param requestBody
     * @returns ApiResultFeedbackIssueDetailResponse OK
     * @throws ApiError
     */
    public updateArchiveStatus(
        requestBody: FeedbackIssueArchiveRequest,
    ): CancelablePromise<ApiResultFeedbackIssueDetailResponse> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/feedback/issue/archive',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 创建反馈 Issue
     * @param requestBody
     * @returns ApiResultFeedbackIssueDetailResponse OK
     * @throws ApiError
     */
    public createIssue(
        requestBody: FeedbackIssueCreateRequest,
    ): CancelablePromise<ApiResultFeedbackIssueDetailResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/feedback/issue',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 分页获取反馈 Issue 列表
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponseFeedbackIssueListItemResponse OK
     * @throws ApiError
     */
    public pageIssues(
        requestBody: FeedbackIssuePageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseFeedbackIssueListItemResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/feedback/issue/page',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取反馈 Issue 详情
     * @param feedbackIssueId
     * @returns ApiResultFeedbackIssueDetailResponse OK
     * @throws ApiError
     */
    public getIssueDetail(
        feedbackIssueId: number,
    ): CancelablePromise<ApiResultFeedbackIssueDetailResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/feedback/issue/detail',
            query: {
                'feedbackIssueId': feedbackIssueId,
            },
        });
    }
}
