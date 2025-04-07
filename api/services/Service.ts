/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AbilityPageRequest } from '../models/AbilityPageRequest';
import type { AbilitySetRequest } from '../models/AbilitySetRequest';
import type { AbilityUpdateRequest } from '../models/AbilityUpdateRequest';
import type { AddRoleRequest } from '../models/AddRoleRequest';
import type { AdminAddRequset } from '../models/AdminAddRequset';
import type { AdminRevokeRequest } from '../models/AdminRevokeRequest';
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultCursorPageBaseResponseChatMessageResponse } from '../models/ApiResultCursorPageBaseResponseChatMessageResponse';
import type { ApiResultGroup } from '../models/ApiResultGroup';
import type { ApiResultListChatMessageResponse } from '../models/ApiResultListChatMessageResponse';
import type { ApiResultListGroup } from '../models/ApiResultListGroup';
import type { ApiResultListGroupMember } from '../models/ApiResultListGroupMember';
import type { ApiResultListRoleAbility } from '../models/ApiResultListRoleAbility';
import type { ApiResultListRoleAvatar } from '../models/ApiResultListRoleAvatar';
import type { ApiResultListRoleResponse } from '../models/ApiResultListRoleResponse';
import type { ApiResultListRule } from '../models/ApiResultListRule';
import type { ApiResultListUserRole } from '../models/ApiResultListUserRole';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultMessage } from '../models/ApiResultMessage';
import type { ApiResultPageBaseRespRoleAbility } from '../models/ApiResultPageBaseRespRoleAbility';
import type { ApiResultPageBaseRespRoleResponse } from '../models/ApiResultPageBaseRespRoleResponse';
import type { ApiResultPageBaseRespRule } from '../models/ApiResultPageBaseRespRule';
import type { ApiResultRoleAbility } from '../models/ApiResultRoleAbility';
import type { ApiResultRoleAvatar } from '../models/ApiResultRoleAvatar';
import type { ApiResultRoleResponse } from '../models/ApiResultRoleResponse';
import type { ApiResultRule } from '../models/ApiResultRule';
import type { ApiResultString } from '../models/ApiResultString';
import type { ApiResultUserInfoResponse } from '../models/ApiResultUserInfoResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ChatMessagePageRequest } from '../models/ChatMessagePageRequest';
import type { ChatMessageRequest } from '../models/ChatMessageRequest';
import type { DeleteRoleRequest } from '../models/DeleteRoleRequest';
import type { GroupAddRequest } from '../models/GroupAddRequest';
import type { MemberAddRequest } from '../models/MemberAddRequest';
import type { MemberDeleteRequest } from '../models/MemberDeleteRequest';
import type { Message } from '../models/Message';
import type { MoveMessageRequest } from '../models/MoveMessageRequest';
import type { RoleAvatar } from '../models/RoleAvatar';
import type { RoleAvatarCreateRequest } from '../models/RoleAvatarCreateRequest';
import type { RoleCreateRequest } from '../models/RoleCreateRequest';
import type { RolePageQueryRequest } from '../models/RolePageQueryRequest';
import type { RoleUpdateRequest } from '../models/RoleUpdateRequest';
import type { RuleCloneRequest } from '../models/RuleCloneRequest';
import type { RuleCreateRequest } from '../models/RuleCreateRequest';
import type { RulePageRequest } from '../models/RulePageRequest';
import type { RuleUpdateRequest } from '../models/RuleUpdateRequest';
import type { SubRoomRequest } from '../models/SubRoomRequest';
import type { UserLoginRequest } from '../models/UserLoginRequest';
import type { UserRegisterRequest } from '../models/UserRegisterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class Service {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新规则
     * 更新现有规则的信息，包括名称、描述及相关模板
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateRule(
        requestBody: RuleUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/rule/update',
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
     * 根据id获取角色
     * @param roleId
     * @returns ApiResultRoleResponse OK
     * @throws ApiError
     */
    public getRole(
        roleId: number,
    ): CancelablePromise<ApiResultRoleResponse> {
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
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateRole(
        requestBody: RoleUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
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
     * 新增角色，返回角色id
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public createRole(
        requestBody: RoleCreateRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
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
     * 根据id批量删除角色
     * @param roleId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteRole(
        roleId: Array<number>,
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
     * 根据能力id获取角色能力
     * @param abilityId
     * @returns ApiResultRoleAbility OK
     * @throws ApiError
     */
    public getRoleAbility(
        abilityId: number,
    ): CancelablePromise<ApiResultRoleAbility> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role/ability',
            query: {
                'abilityId': abilityId,
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
     * 更新能力
     * 更新指定角色的能力信息，act和ability字段不能为null或者空json
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateRoleAbility(
        requestBody: AbilityUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
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
     * 创建能力
     * 创建指定角色在指定规则下的能力信息，返回创建的能力ID，act和ability字段不能为null或者空json
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public setRoleAbility(
        requestBody: AbilitySetRequest,
    ): CancelablePromise<ApiResultLong> {
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
     * 根据id删除能力
     * @param abilityId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteRoleAbility(
        abilityId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/role/ability',
            query: {
                'abilityId': abilityId,
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
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteRoleAvatar(
        avatarId: number,
    ): CancelablePromise<ApiResultVoid> {
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
     * 创建规则
     * 创建一个新的游戏规则，包含规则名称、描述及相关模板
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public createRule(
        requestBody: RuleCreateRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/rule/create',
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
     * 克隆规则
     * 基于现有规则创建一个新的规则副本，可自定义名称和描述
     * @param requestBody
     * @returns ApiResultRule OK
     * @throws ApiError
     */
    public cloneRule(
        requestBody: RuleCloneRequest,
    ): CancelablePromise<ApiResultRule> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/rule/clone',
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
     * 发送消息（备用）,骰娘回复
     * 从设计上是为了弱网环境的处理，但实际上没怎么用
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public sendMessageAiResponse(
        requestBody: ChatMessageRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/chat/message/ai',
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
     * 分页获取规则列表
     * 分页获取规则列表，支持通过关键词搜索规则名称或描述
     * @param request
     * @returns ApiResultPageBaseRespRule OK
     * @throws ApiError
     */
    public getRulePage(
        request: RulePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespRule> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/rule/page',
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
     * 获取规则列表
     * 获取所有规则的列表
     * @returns ApiResultListRule OK
     * @throws ApiError
     */
    public getRuleList(): CancelablePromise<ApiResultListRule> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/rule/list',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取规则详情
     * 获取指定ID规则的详细信息
     * @param ruleId 规则ID
     * @returns ApiResultRule OK
     * @throws ApiError
     */
    public getRuleDetail(
        ruleId: number,
    ): CancelablePromise<ApiResultRule> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/rule/detail/{ruleId}',
            path: {
                'ruleId': ruleId,
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
     * @returns ApiResultListRoleResponse OK
     * @throws ApiError
     */
    public getUserRoles(
        userId: number,
    ): CancelablePromise<ApiResultListRoleResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role/user',
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
     * 分页获取角色,支持姓名模糊查询
     * @param request
     * @returns ApiResultPageBaseRespRoleResponse OK
     * @throws ApiError
     */
    public getRolesByPage(
        request: RolePageQueryRequest,
    ): CancelablePromise<ApiResultPageBaseRespRoleResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role/page',
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
     * 分页查询角色能力
     * 根据角色Id分页查询角色能力
     * @param abilityPageRequest
     * @returns ApiResultPageBaseRespRoleAbility OK
     * @throws ApiError
     */
    public pageRoleAbility(
        abilityPageRequest: AbilityPageRequest,
    ): CancelablePromise<ApiResultPageBaseRespRoleAbility> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role/ability/page',
            query: {
                'abilityPageRequest': abilityPageRequest,
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
     * 根据角色id获得角色的所有能力
     * @param roleId
     * @returns ApiResultListRoleAbility OK
     * @throws ApiError
     */
    public listRoleAbility(
        roleId: number,
    ): CancelablePromise<ApiResultListRoleAbility> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role/ability/list',
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
            url: '/capi/avatar/list',
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
     * 删除规则
     * 删除指定ID的规则
     * @param ruleId 规则ID
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteRule(
        ruleId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/rule/delete/{ruleId}',
            path: {
                'ruleId': ruleId,
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
