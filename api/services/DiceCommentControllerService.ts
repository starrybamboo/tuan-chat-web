/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DiceCommentControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 测试骰子评论生成
     * 传入骰子结果，生成相应的评论
     * @param result 骰子结果
     * @returns string OK
     * @throws ApiError
     */
    public testDiceComment(
        result: string,
    ): CancelablePromise<string> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/test/dice-comment',
            query: {
                'result': result,
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
