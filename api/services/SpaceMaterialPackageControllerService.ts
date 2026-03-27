/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultPageBaseRespSpaceMaterialPackageResponse } from '../models/ApiResultPageBaseRespSpaceMaterialPackageResponse';
import type { ApiResultSpaceMaterialPackageResponse } from '../models/ApiResultSpaceMaterialPackageResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { SpaceMaterialPackageCreateRequest } from '../models/SpaceMaterialPackageCreateRequest';
import type { SpaceMaterialPackageImportRequest } from '../models/SpaceMaterialPackageImportRequest';
import type { SpaceMaterialPackagePageRequest } from '../models/SpaceMaterialPackagePageRequest';
import type { SpaceMaterialPackageUpdateRequest } from '../models/SpaceMaterialPackageUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceMaterialPackageControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新局内素材包
     * @param requestBody
     * @returns ApiResultSpaceMaterialPackageResponse OK
     * @throws ApiError
     */
    public updatePackage(
        requestBody: SpaceMaterialPackageUpdateRequest,
    ): CancelablePromise<ApiResultSpaceMaterialPackageResponse> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/materialPackage',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 创建局内素材包
     * @param requestBody
     * @returns ApiResultSpaceMaterialPackageResponse OK
     * @throws ApiError
     */
    public createPackage(
        requestBody: SpaceMaterialPackageCreateRequest,
    ): CancelablePromise<ApiResultSpaceMaterialPackageResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/materialPackage',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 删除局内素材包
     * @param spacePackageId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deletePackage(
        spacePackageId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/space/materialPackage',
            query: {
                'spacePackageId': spacePackageId,
            },
        });
    }
    /**
     * 分页获取局内素材包
     * @param requestBody
     * @returns ApiResultPageBaseRespSpaceMaterialPackageResponse OK
     * @throws ApiError
     */
    public pagePackages(
        requestBody: SpaceMaterialPackagePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespSpaceMaterialPackageResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/materialPackage/page',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 从局外素材包导入到局内
     * @param requestBody
     * @returns ApiResultSpaceMaterialPackageResponse OK
     * @throws ApiError
     */
    public importPackage(
        requestBody: SpaceMaterialPackageImportRequest,
    ): CancelablePromise<ApiResultSpaceMaterialPackageResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/materialPackage/import',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取局内素材包详情
     * @param spacePackageId
     * @returns ApiResultSpaceMaterialPackageResponse OK
     * @throws ApiError
     */
    public getDetail(
        spacePackageId: number,
    ): CancelablePromise<ApiResultSpaceMaterialPackageResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/materialPackage/detail',
            query: {
                'spacePackageId': spacePackageId,
            },
        });
    }
}
