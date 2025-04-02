/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddRoleRequest } from '../models/AddRoleRequest';
import type { AdminAddRequset } from '../models/AdminAddRequset';
import type { AdminRevokeRequest } from '../models/AdminRevokeRequest';
import type { ApiResult } from '../models/ApiResult';
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultCursorPageBaseResponseChatMessageResponse } from '../models/ApiResultCursorPageBaseResponseChatMessageResponse';
import type { ApiResultGroup } from '../models/ApiResultGroup';
import type { ApiResultListChatMessageResponse } from '../models/ApiResultListChatMessageResponse';
import type { ApiResultListGroup } from '../models/ApiResultListGroup';
import type { ApiResultListGroupMember } from '../models/ApiResultListGroupMember';
import type { ApiResultListRoleAvatar } from '../models/ApiResultListRoleAvatar';
import type { ApiResultListUserRole } from '../models/ApiResultListUserRole';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultMessage } from '../models/ApiResultMessage';
import type { ApiResultRoleAbilityTable } from '../models/ApiResultRoleAbilityTable';
import type { ApiResultRoleAvatar } from '../models/ApiResultRoleAvatar';
import type { ApiResultString } from '../models/ApiResultString';
import type { ApiResultUserInfoResponse } from '../models/ApiResultUserInfoResponse';
import type { ApiResultUserRole } from '../models/ApiResultUserRole';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ChatMessagePageRequest } from '../models/ChatMessagePageRequest';
import type { ChatMessageRequest } from '../models/ChatMessageRequest';
import type { DeleteRoleRequest } from '../models/DeleteRoleRequest';
import type { GroupAddRequest } from '../models/GroupAddRequest';
import type { MemberAddRequest } from '../models/MemberAddRequest';
import type { MemberDeleteRequest } from '../models/MemberDeleteRequest';
import type { Message } from '../models/Message';
import type { MoveMessageRequest } from '../models/MoveMessageRequest';
import type { RoleAbilityTable } from '../models/RoleAbilityTable';
import type { RoleAvatar } from '../models/RoleAvatar';
import type { RoleAvatarCreateRequest } from '../models/RoleAvatarCreateRequest';
import type { SubRoomRequest } from '../models/SubRoomRequest';
import type { UserLoginRequest } from '../models/UserLoginRequest';
import type { UserRegisterRequest } from '../models/UserRegisterRequest';
import type { UserRole } from '../models/UserRole';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class Service {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 根据id获取角色
     * @param roleId
     * @returns ApiResultUserRole OK
     * @throws ApiError
     */
    public getRole(
        roleId: number,
    ): CancelablePromise<ApiResultUserRole> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role',
            query: {
                'roleId': roleId,
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
     * 更新角色信息
     * @param requestBody
     * @returns ApiResultUserRole OK
     * @throws ApiError
     */
    public updateRole(
        requestBody: UserRole,
    ): CancelablePromise<ApiResultUserRole> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/role',
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
     * 新增角色
     * @returns ApiResultUserRole OK
     * @throws ApiError
     */
    public createRole(): CancelablePromise<ApiResultUserRole> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/role',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 根据id删除角色
     * @param roleId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteRole(
        roleId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/role',
            query: {
                'roleId': roleId,
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
     * 设置用户为玩家
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public setPlayer(
        requestBody: AdminAddRequset,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/group/member/player',
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
     * 撤销用户玩家的身份
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public revokePlayer(
        requestBody: AdminRevokeRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/group/member/player',
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
     * 更新消息
     * 只要有更新都走这个接口
     * @param requestBody
     * @returns ApiResultMessage OK
     * @throws ApiError
     */
    public updateMessage(
        requestBody: Message,
    ): CancelablePromise<ApiResultMessage> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/chat/message',
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
     * 发送消息（备用）
     * 从设计上是为了弱网环境的处理，但实际上没怎么用
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public sendMessage(
        requestBody: ChatMessageRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/chat/message',
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
     * 移动消息位置
     * 根据beforeMessageId和afterMessageId自动判断移动类型：当都为null时返回错误，一个为null时分别对应移动到顶部或底部，都有值时表示移动到两者之间
     * @param request
     * @returns ApiResultMessage OK
     * @throws ApiError
     */
    public moveMessage(
        request: MoveMessageRequest,
    ): CancelablePromise<ApiResultMessage> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/chat/message/move',
            query: {
                'request': request,
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
     * 根据id获取头像
     * @param avatarId
     * @returns ApiResultRoleAvatar OK
     * @throws ApiError
     */
    public getRoleAvatar(
        avatarId: number,
    ): CancelablePromise<ApiResultRoleAvatar> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/avatar',
            query: {
                'avatarId': avatarId,
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
     * 根据头像id更新头像
     * @param requestBody
     * @returns ApiResultRoleAvatar OK
     * @throws ApiError
     */
    public updateRoleAvatar(
        requestBody: RoleAvatar,
    ): CancelablePromise<ApiResultRoleAvatar> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/avatar',
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
     * 创建头像，并返回头像ID
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public setRoleAvatar(
        requestBody: RoleAvatarCreateRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/avatar',
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
     * 根据id删除头像
     * @param avatarId
     * @returns ApiResult OK
     * @throws ApiError
     */
    public deleteRoleAvatar(
        avatarId: number,
    ): CancelablePromise<ApiResult> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/avatar',
            query: {
                'avatarId': avatarId,
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
     * 用户注册
     * 用户注册接口
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public register(
        requestBody: UserRegisterRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/user/public/register',
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
     * 用户登录
     * 用户登录接口
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public login(
        requestBody: UserLoginRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/user/public/login',
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
     * 获取角色能力
     * @param roleId
     * @returns ApiResultRoleAbilityTable OK
     * @throws ApiError
     */
    public getRoleAbility(
        roleId: number,
    ): CancelablePromise<ApiResultRoleAbilityTable> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role/ability',
            query: {
                'roleId': roleId,
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
     * 设置&&更新角色能力
     * @param requestBody
     * @returns ApiResult OK
     * @throws ApiError
     */
    public setRoleAbility(
        requestBody: RoleAbilityTable,
    ): CancelablePromise<ApiResult> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/role/ability',
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
     * 创建子群
     * @param requestBody
     * @returns ApiResultGroup OK
     * @throws ApiError
     */
    public createSubgroup(
        requestBody: SubRoomRequest,
    ): CancelablePromise<ApiResultGroup> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/group/subgroup',
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
     * 增加群聊的角色
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addRole(
        requestBody: AddRoleRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/group/role/',
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
     * 删除群聊的角色
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteRole1(
        requestBody: DeleteRoleRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/group/role/',
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
     * 新增群成员
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addMember(
        requestBody: MemberAddRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/group/member/',
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
     * 删除群成员
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteMember(
        requestBody: MemberDeleteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/group/member/',
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
     * 创建群组
     * @param requestBody
     * @returns ApiResultGroup OK
     * @throws ApiError
     */
    public createGroup(
        requestBody: GroupAddRequest,
    ): CancelablePromise<ApiResultGroup> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/group/',
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
     * 按页获取消息列表
     * 用的是游标翻页
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponseChatMessageResponse OK
     * @throws ApiError
     */
    public getMsgPage(
        requestBody: ChatMessagePageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseChatMessageResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/chat/message/page',
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
     * 获取用户信息
     * 用户登录接口
     * @param userId
     * @returns ApiResultUserInfoResponse OK
     * @throws ApiError
     */
    public getUserInfo(
        userId: number,
    ): CancelablePromise<ApiResultUserInfoResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/user/info',
            query: {
                'userId': userId,
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
     * 获取用户的所有角色
     * @param userId
     * @returns ApiResultListUserRole OK
     * @throws ApiError
     */
    public getUserRoles(
        userId: number,
    ): CancelablePromise<ApiResultListUserRole> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role/user/{userId}',
            path: {
                'userId': userId,
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
     * 获取角色所有的头像
     * @param roleId
     * @returns ApiResultListRoleAvatar OK
     * @throws ApiError
     */
    public getRoleAvatars(
        roleId: number,
    ): CancelablePromise<ApiResultListRoleAvatar> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role/avatar',
            query: {
                'roleId': roleId,
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
     * 获取群组信息
     * @param groupId
     * @returns ApiResultGroup OK
     * @throws ApiError
     */
    public getGroupInfo(
        groupId: number,
    ): CancelablePromise<ApiResultGroup> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/group/{groupId}',
            path: {
                'groupId': groupId,
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
     * 获取群聊的所有角色
     * @param roomId
     * @returns ApiResultListUserRole OK
     * @throws ApiError
     */
    public groupRole(
        roomId: number,
    ): CancelablePromise<ApiResultListUserRole> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/group/role/list',
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
     * 获取群成员列表
     * @param roomId
     * @returns ApiResultListGroupMember OK
     * @throws ApiError
     */
    public getMemberList(
        roomId: number,
    ): CancelablePromise<ApiResultListGroupMember> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/group/member/list',
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
     * 获取当前用户加入的所有群聊
     * @returns ApiResultListGroup OK
     * @throws ApiError
     */
    public getUserGroups(): CancelablePromise<ApiResultListGroup> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/group/list',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取一个群的所有消息
     * @param roomId
     * @returns ApiResultListChatMessageResponse OK
     * @throws ApiError
     */
    public getAllMessage(
        roomId: number,
    ): CancelablePromise<ApiResultListChatMessageResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/chat/message/all',
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
}
