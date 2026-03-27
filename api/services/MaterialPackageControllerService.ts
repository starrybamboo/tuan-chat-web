/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultMaterialPackageResponse } from '../models/ApiResultMaterialPackageResponse';
import type { ApiResultPageBaseRespMaterialPackageResponse } from '../models/ApiResultPageBaseRespMaterialPackageResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { MaterialPackageCreateRequest } from '../models/MaterialPackageCreateRequest';
import type { MaterialPackagePageRequest } from '../models/MaterialPackagePageRequest';
import type { MaterialPackageUpdateRequest } from '../models/MaterialPackageUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class MaterialPackageControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新局外素材包
     * @param requestBody
     * @returns ApiResultMaterialPackageResponse OK
     * @throws ApiError
     */
    public updatePackage1(
        requestBody: MaterialPackageUpdateRequest,
    ): CancelablePromise<ApiResultMaterialPackageResponse> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/materialPackage',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 创建局外素材包
     * @param requestBody
     * @returns ApiResultMaterialPackageResponse OK
     * @throws ApiError
     */
    public createPackage1(
        requestBody: MaterialPackageCreateRequest,
    ): CancelablePromise<ApiResultMaterialPackageResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/materialPackage',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 删除局外素材包
     * @param packageId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deletePackage1(
        packageId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/materialPackage',
            query: {
                'packageId': packageId,
            },
        });
    }
    /**
     * 分页获取公开素材包
     * @param requestBody
     * @returns ApiResultPageBaseRespMaterialPackageResponse OK
     * @throws ApiError
     */
    public pagePublicPackages(
        requestBody: MaterialPackagePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespMaterialPackageResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/materialPackage/public/page',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 分页获取我的局外素材包
     * @param requestBody
     * @returns ApiResultPageBaseRespMaterialPackageResponse OK
     * @throws ApiError
     */
    public pageMyPackages(
        requestBody: MaterialPackagePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespMaterialPackageResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/materialPackage/my/page',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取局外素材包详情
     * @param packageId
     * @returns ApiResultMaterialPackageResponse OK
     * @throws ApiError
     */
    public getDetail1(
        packageId: number,
    ): CancelablePromise<ApiResultMaterialPackageResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/materialPackage/detail',
            query: {
                'packageId': packageId,
            },
        });
    }
}
