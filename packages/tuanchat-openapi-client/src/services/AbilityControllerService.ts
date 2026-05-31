/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AbilityBatchQueryRequest } from '../models/AbilityBatchQueryRequest';
import type { AbilityByRuleFieldUpdateRequest } from '../models/AbilityByRuleFieldUpdateRequest';
import type { AbilityByRuleUpdateRequest } from '../models/AbilityByRuleUpdateRequest';
import type { AbilityPageRequest } from '../models/AbilityPageRequest';
import type { AbilitySetRequest } from '../models/AbilitySetRequest';
import type { ApiResultListRoleAbility } from '../models/ApiResultListRoleAbility';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultMapStringRoleAbility } from '../models/ApiResultMapStringRoleAbility';
import type { ApiResultPageBaseRespRoleAbility } from '../models/ApiResultPageBaseRespRoleAbility';
import type { ApiResultRoleAbility } from '../models/ApiResultRoleAbility';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AbilityControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 根据角色id和规则id获取能力
     * @param ruleId
     * @param roleId
     * @returns ApiResultRoleAbility OK
     * @throws ApiError
     */
    public getRoleAbilityByRule(
        ruleId: number,
        roleId: number,
    ): CancelablePromise<ApiResultRoleAbility> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/role/ability/by-rule',
            query: {
                'ruleId': ruleId,
                'roleId': roleId,
            },
        });
    }
    /**
     * 按角色和规则更新能力
     * 更新指定角色在指定规则下的能力信息，act和ability字段不能同时为null或者空json
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateRoleAbilityByRule(
        requestBody: AbilityByRuleUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/role/ability/by-rule',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 按角色和规则更新能力字段
     * 更改能力字段或删除字段
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateRoleAbilityFieldByRule(
        requestBody: AbilityByRuleFieldUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/role/ability/by-rule/field',
            body: requestBody,
            mediaType: 'application/json',
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
            url: '/role/ability',
            query: {
                'abilityId': abilityId,
            },
        });
    }
    /**
     * 创建能力
     * 创建指定角色在指定规则下的能力信息，返回创建的能力ID，act和ability字段不能同时为null或者空json
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public setRoleAbility(
        requestBody: AbilitySetRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/role/ability',
            body: requestBody,
            mediaType: 'application/json',
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
            url: '/role/ability',
            query: {
                'abilityId': abilityId,
            },
        });
    }
    /**
     * 分页查询角色能力
     * 根据角色Id分页查询角色能力
     * @param requestBody
     * @returns ApiResultPageBaseRespRoleAbility OK
     * @throws ApiError
     */
    public pageRoleAbility(
        requestBody: AbilityPageRequest,
    ): CancelablePromise<ApiResultPageBaseRespRoleAbility> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/role/ability/page',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 批量查询角色能力
     * 根据规则ID和多个角色ID批量查询能力
     * @param requestBody
     * @returns ApiResultMapStringRoleAbility OK
     * @throws ApiError
     */
    public batchGetByRuleAndRoles(
        requestBody: AbilityBatchQueryRequest,
    ): CancelablePromise<ApiResultMapStringRoleAbility> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/role/ability/batch',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 根据角色id获得角色的所有能力
     * @param roleId
     * @param commitId
     * @returns ApiResultListRoleAbility OK
     * @throws ApiError
     */
    public listRoleAbility(
        roleId: number,
        commitId?: number,
    ): CancelablePromise<ApiResultListRoleAbility> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/role/ability/list',
            query: {
                'roleId': roleId,
                'commitId': commitId,
            },
        });
    }
}
