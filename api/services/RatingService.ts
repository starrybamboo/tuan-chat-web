/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultDouble } from '../models/ApiResultDouble';
import type { ApiResultInteger } from '../models/ApiResultInteger';
import type { ApiResultPageBaseRespRatingVO } from '../models/ApiResultPageBaseRespRatingVO';
import type { ApiResultRatingVO } from '../models/ApiResultRatingVO';
import type { RatingPageRequest } from '../models/RatingPageRequest';
import type { RatingRequest } from '../models/RatingRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RatingService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 分页获取目标评分列表
     * 分页获取指定目标的所有评分
     * @param requestBody
     * @returns ApiResultPageBaseRespRatingVO OK
     * @throws ApiError
     */
    public getTargetRatingsByPage(
        requestBody: RatingPageRequest,
    ): CancelablePromise<ApiResultPageBaseRespRatingVO> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/rating/page',
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
     * 提交评分
     * 对指定目标进行评分
     * @param requestBody
     * @returns ApiResultRatingVO OK
     * @throws ApiError
     */
    public submitRating(
        requestBody: RatingRequest,
    ): CancelablePromise<ApiResultRatingVO> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/rating/',
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
     * 获取用户评分
     * 获取指定用户对指定目标的评分，userId为空时获取当前登录用户的评分
     * @param userId 用户ID，不传则获取当前登录用户的评分
     * @param targetId 目标ID
     * @param targetType ContentTypeEnums
     * @returns ApiResultRatingVO OK
     * @throws ApiError
     */
    public getUserRating(
        userId: number,
        targetId: number,
        targetType: string,
    ): CancelablePromise<ApiResultRatingVO> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/rating/user',
            query: {
                'userId': userId,
                'targetId': targetId,
                'targetType': targetType,
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
     * 计算评分消耗
     * 计算指定评分需要消耗的社交点数
     * @param score 评分值(-2~15)
     * @returns ApiResultInteger OK
     * @throws ApiError
     */
    public calculateCost(
        score: string,
    ): CancelablePromise<ApiResultInteger> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/rating/cost',
            query: {
                'score': score,
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
     * 获取目标平均评分
     * 获取指定目标的平均评分
     * @param targetId 目标ID
     * @param targetType ContentTypeEnums
     * @returns ApiResultDouble OK
     * @throws ApiError
     */
    public getAverageScore(
        targetId: number,
        targetType: string,
    ): CancelablePromise<ApiResultDouble> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/rating/average',
            query: {
                'targetId': targetId,
                'targetType': targetType,
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
