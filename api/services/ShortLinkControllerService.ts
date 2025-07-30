/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ShortLinkControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @param shortCode
     * @returns any OK
     * @throws ApiError
     */
    public redirectToOriginal(
        shortCode: string,
    ): CancelablePromise<Record<string, any>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/s/{shortCode}',
            path: {
                'shortCode': shortCode,
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
