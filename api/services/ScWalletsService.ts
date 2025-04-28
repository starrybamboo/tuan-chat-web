/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultScWalletBalanceVO } from '../models/ApiResultScWalletBalanceVO';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ScWalletsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 查询用户SC余额
     * @param userId 用户ID
     * @returns ApiResultScWalletBalanceVO OK
     * @throws ApiError
     */
    public getBalance(
        userId: number,
    ): CancelablePromise<ApiResultScWalletBalanceVO> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/sc/wallet/balance',
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
}
