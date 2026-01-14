/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class Service {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @returns any Everything is running fine.
     * @throws ApiError
     */
    public appControllerHealthCheck(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/',
        });
    }
}
