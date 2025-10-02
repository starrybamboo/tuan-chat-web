/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListScTransactionVO } from '../models/ApiResultListScTransactionVO';
import type { ApiResultScTransactionVO } from '../models/ApiResultScTransactionVO';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ScTransactionsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取用户交易记录
     * @param userId 用户ID
     * @param limit 查询数量限制
     * @returns ApiResultListScTransactionVO OK
     * @throws ApiError
     */
    public getUserTransactions(
        userId: number,
        limit: number = 20,
    ): CancelablePromise<ApiResultListScTransactionVO> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/sc/transaction/list',
            query: {
                'userId': userId,
                'limit': limit,
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
     * 根据交易号查询交易详情
     * @param transactionNo 交易编号
     * @returns ApiResultScTransactionVO OK
     * @throws ApiError
     */
    public getTransactionDetail(
        transactionNo: string,
    ): CancelablePromise<ApiResultScTransactionVO> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/sc/transaction/detail',
            query: {
                'transactionNo': transactionNo,
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
