/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultRoomDndMapResponse } from '../models/ApiResultRoomDndMapResponse';
import type { ApiResultRoomDndMapTokenResponse } from '../models/ApiResultRoomDndMapTokenResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RoomDndMapClearRequest } from '../models/RoomDndMapClearRequest';
import type { RoomDndMapTokenRemoveRequest } from '../models/RoomDndMapTokenRemoveRequest';
import type { RoomDndMapTokenUpsertRequest } from '../models/RoomDndMapTokenUpsertRequest';
import type { RoomDndMapUpsertRequest } from '../models/RoomDndMapUpsertRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RoomDndMapControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get room DND map
     * @param roomId
     * @returns ApiResultRoomDndMapResponse OK
     * @throws ApiError
     */
    public getRoomMap(
        roomId: number,
    ): CancelablePromise<ApiResultRoomDndMapResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/room/dnd-map',
            query: {
                'roomId': roomId,
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
     * Upsert room DND map
     * @param requestBody
     * @returns ApiResultRoomDndMapResponse OK
     * @throws ApiError
     */
    public upsertRoomMap(
        requestBody: RoomDndMapUpsertRequest,
    ): CancelablePromise<ApiResultRoomDndMapResponse> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/room/dnd-map',
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
     * Clear room DND map
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public clearRoomMap(
        requestBody: RoomDndMapClearRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/room/dnd-map',
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
     * Upsert room DND map token
     * @param requestBody
     * @returns ApiResultRoomDndMapTokenResponse OK
     * @throws ApiError
     */
    public upsertToken(
        requestBody: RoomDndMapTokenUpsertRequest,
    ): CancelablePromise<ApiResultRoomDndMapTokenResponse> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/room/dnd-map/token',
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
     * Remove room DND map token
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public removeToken(
        requestBody: RoomDndMapTokenRemoveRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/room/dnd-map/token',
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
