/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListSpaceMember } from '../models/ApiResultListSpaceMember';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultString } from '../models/ApiResultString';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { LeaderTransferRequest } from '../models/LeaderTransferRequest';
import type { PlayerGrantRequest } from '../models/PlayerGrantRequest';
import type { PlayerRevokeRequest } from '../models/PlayerRevokeRequest';
import type { SpaceMemberAddRequest } from '../models/SpaceMemberAddRequest';
import type { SpaceMemberDeleteRequest } from '../models/SpaceMemberDeleteRequest';
import type { SpaceMemberTypeUpdateRequest } from '../models/SpaceMemberTypeUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceMemberControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 设置空间成员类型
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateMemberType(
        requestBody: SpaceMemberTypeUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/member/type',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 设置用户为玩家
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public grantPlayer(
        requestBody: PlayerGrantRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/member/player',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 将pl设置为观战，同时退出所有房间
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public revokePlayer(
        requestBody: PlayerRevokeRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/space/member/player',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 转让裁判，自己变成pl
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public transferLeader(
        requestBody: LeaderTransferRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/member/leader',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 通过邀请链接加入房间，返回spaceId
     * @param code
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public invited(
        code: string,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/member/invited/{code}',
            path: {
                'code': code,
            },
        });
    }
    /**
     * 在空间内新增观战成员
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addMember(
        requestBody: SpaceMemberAddRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/member/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 删除空间成员
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteMember(
        requestBody: SpaceMemberDeleteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/space/member/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取空间成员列表
     * @param spaceId
     * @returns ApiResultListSpaceMember OK
     * @throws ApiError
     */
    public getMemberList(
        spaceId: number,
    ): CancelablePromise<ApiResultListSpaceMember> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/member/list',
            query: {
                'spaceId': spaceId,
            },
        });
    }
    /**
     * 生成邀请码，过期时间以天为单位，为空则不过期,type0观战,type1玩家邀请
     * @param spaceId
     * @param type
     * @param duration
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public inviteCode(
        spaceId: number,
        type: number,
        duration?: number,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/member/inviteCode',
            query: {
                'spaceId': spaceId,
                'type': type,
                'duration': duration,
            },
        });
    }
    /**
     * 退出空间
     * @param spaceId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public exitSpace(
        spaceId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/space/member/exit',
            query: {
                'spaceId': spaceId,
            },
        });
    }
}
