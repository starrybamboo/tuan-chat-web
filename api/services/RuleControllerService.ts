/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultPageBaseRespRuleResponse } from '../models/ApiResultPageBaseRespRuleResponse';
import type { ApiResultRule } from '../models/ApiResultRule';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RuleCloneRequest } from '../models/RuleCloneRequest';
import type { RuleCreateRequest } from '../models/RuleCreateRequest';
import type { RulePageRequest } from '../models/RulePageRequest';
import type { RuleUpdateRequest } from '../models/RuleUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RuleControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新规则
     * 更新现有规则的信息，包括名称、描述及相关模板，因为要支持顺序，只支持全量更新
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
     * 分页获取规则列表
     * 分页获取规则列表，支持通过关键词搜索规则名称或描述
     * @param requestBody
     * @returns ApiResultPageBaseRespRuleResponse OK
     * @throws ApiError
     */
    public getRulePage(
        requestBody: RulePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespRuleResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/rule/page',
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
