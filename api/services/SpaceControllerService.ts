/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultListSpace } from '../models/ApiResultListSpace';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultRoom } from '../models/ApiResultRoom';
import type { ApiResultSpace } from '../models/ApiResultSpace';
import type { ApiResultString } from '../models/ApiResultString';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RoomAddRequest } from '../models/RoomAddRequest';
import type { SpaceAddRequest } from '../models/SpaceAddRequest';
import type { SpaceArchiveRequest } from '../models/SpaceArchiveRequest';
import type { SpaceCloneRequest } from '../models/SpaceCloneRequest';
import type { SpaceExtraRequest } from '../models/SpaceExtraRequest';
import type { SpaceExtraSetRequest } from '../models/SpaceExtraSetRequest';
import type { SpaceOwnerTransferRequest } from '../models/SpaceOwnerTransferRequest';
import type { SpaceUpdateRequest } from '../models/SpaceUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 鏇存柊绌洪棿褰掓。鐘舵€?
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateSpaceArchiveStatus(
        requestBody: SpaceArchiveRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space',
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
     * 杞绌洪棿
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public transferSpaceOwner(
        requestBody: SpaceOwnerTransferRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/transfer',
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
     * 鑾峰彇绌洪棿鍏朵粬淇℃伅
     * @param spaceId
     * @param key
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public getSpaceExtra(
        spaceId: number,
        key: string,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/extra',
            query: {
                'spaceId': spaceId,
                'key': key,
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
     * 鏂板鎴栦慨鏀圭┖闂村叾浠栦俊鎭?
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public setSpaceExtra(
        requestBody: SpaceExtraSetRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/extra',
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
     * 鍒犻櫎绌洪棿鍏朵粬淇℃伅
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteSpaceExtra(
        requestBody: SpaceExtraRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/space/extra',
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
     * 鏇存柊绌洪棿淇℃伅(鍚嶇О銆佸ご鍍忋€佹弿杩般€佽鍒?
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateSpace(
        requestBody: SpaceUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/',
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
     * 鍒涘缓绌洪棿锛岄個璇风殑鎵€鏈夋垚鍛橀兘涓簆l
     * @param requestBody
     * @returns ApiResultSpace OK
     * @throws ApiError
     */
    public createSpace(
        requestBody: SpaceAddRequest,
    ): CancelablePromise<ApiResultSpace> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/',
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
     * 鍒涘缓鎴块棿
     * @param requestBody
     * @returns ApiResultRoom OK
     * @throws ApiError
     */
    public createRoom(
        requestBody: RoomAddRequest,
    ): CancelablePromise<ApiResultRoom> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/room',
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
     * 鏍规嵁spaceId鐩存帴鍏嬮殕绌洪棿
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public cloneBySpaceId(
        requestBody: SpaceCloneRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/clone',
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
     * 鑾峰彇绌洪棿
     * @param spaceId
     * @returns ApiResultSpace OK
     * @throws ApiError
     */
    public getSpaceInfo(
        spaceId: number,
    ): CancelablePromise<ApiResultSpace> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/{spaceId}',
            path: {
                'spaceId': spaceId,
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
     * 瑙ｆ暎绌洪棿
     * @param spaceId
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public dissolveSpace(
        spaceId: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/space/{spaceId}',
            path: {
                'spaceId': spaceId,
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
     * 鑾峰彇褰撳墠鐢ㄦ埛鍔犲叆鐨勬墍鏈夌┖闂?
     * @returns ApiResultListSpace OK
     * @throws ApiError
     */
    public getUserSpaces(): CancelablePromise<ApiResultListSpace> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/list',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取当前用户加入的未归档空间
     * @returns ApiResultListSpace OK
     * @throws ApiError
     */
    public getUserActiveSpaces(): CancelablePromise<ApiResultListSpace> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/list/active',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * 获取当前用户加入的已归档空间
     * @returns ApiResultListSpace OK
     * @throws ApiError
     */
    public getUserArchivedSpaces(): CancelablePromise<ApiResultListSpace> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/list/archived',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 鍙戠幇-骞垮満锛氭煡鐪嬫墍鏈変汉鐨勫綊妗ｇ兢鑱婏紙绌洪棿锛?
     * @returns ApiResultListSpace OK
     * @throws ApiError
     */
    public listArchivedSpacesSquare(): CancelablePromise<ApiResultListSpace> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/archive/square',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 鍙戠幇-鎴戠殑褰掓。锛氭煡鐪嬫垜涓汉褰掓。鐨勭兢鑱婏紙绌洪棿锛?
     * @returns ApiResultListSpace OK
     * @throws ApiError
     */
    public listArchivedSpacesMy(): CancelablePromise<ApiResultListSpace> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/archive/my',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
