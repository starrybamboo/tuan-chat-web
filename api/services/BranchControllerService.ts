/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBranchResponse } from '../models/ApiResultBranchResponse';
import type { ApiResultListBranchResponse } from '../models/ApiResultListBranchResponse';
import type { ApiResultListCommitShownResponse } from '../models/ApiResultListCommitShownResponse';
import type { ApiResultMapStringListDiffResult } from '../models/ApiResultMapStringListDiffResult';
import type { ApiResultMergeDiffResult } from '../models/ApiResultMergeDiffResult';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { BranchCommitsRequest } from '../models/BranchCommitsRequest';
import type { BranchCreateRequest } from '../models/BranchCreateRequest';
import type { BranchDeleteRequest } from '../models/BranchDeleteRequest';
import type { BranchDiffRequest } from '../models/BranchDiffRequest';
import type { BranchListRequest } from '../models/BranchListRequest';
import type { BranchMergeRequest } from '../models/BranchMergeRequest';
import type { CommitDiffRequest } from '../models/CommitDiffRequest';
import type { MergeDiffRequest } from '../models/MergeDiffRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class BranchControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * mergeBranches
     * 合并两个分支
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public mergeBranches(
        requestBody: BranchMergeRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/branch/merge',
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
     * showDiffBeforeMerge
     * 合并两个分支
     * @param requestBody
     * @returns ApiResultMergeDiffResult OK
     * @throws ApiError
     */
    public showDiffBeforeMerge(
        requestBody: MergeDiffRequest,
    ): CancelablePromise<ApiResultMergeDiffResult> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/branch/merge/try',
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
     * listBranches
     * 查询一个模组的所有分支
     * @param requestBody
     * @returns ApiResultListBranchResponse OK
     * @throws ApiError
     */
    public listBranches(
        requestBody: BranchListRequest,
    ): CancelablePromise<ApiResultListBranchResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/branch/list',
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
     * diffBranches
     * 比较两个分支的差异
     * @param requestBody
     * @returns ApiResultMapStringListDiffResult OK
     * @throws ApiError
     */
    public diffBranches(
        requestBody: BranchDiffRequest,
    ): CancelablePromise<ApiResultMapStringListDiffResult> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/branch/diff',
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
     * diffFormerCommit
     * 比较此提交与上一个提交的差异
     * @param requestBody
     * @returns ApiResultMapStringListDiffResult OK
     * @throws ApiError
     */
    public diffFormerCommit(
        requestBody: CommitDiffRequest,
    ): CancelablePromise<ApiResultMapStringListDiffResult> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/branch/diff/commit',
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
     * deleteBranch
     * 删除一个分支
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteBranch(
        requestBody: BranchDeleteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/branch/delete',
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
     * createBranch
     * 新建一个分支
     * @param requestBody
     * @returns ApiResultBranchResponse OK
     * @throws ApiError
     */
    public createBranch(
        requestBody: BranchCreateRequest,
    ): CancelablePromise<ApiResultBranchResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/branch/create',
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
     * listBranchCommits
     * 查询一个分支的所有历史提交
     * @param requestBody
     * @returns ApiResultListCommitShownResponse OK
     * @throws ApiError
     */
    public listBranchCommits(
        requestBody: BranchCommitsRequest,
    ): CancelablePromise<ApiResultListCommitShownResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/branch/commits',
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
