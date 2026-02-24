/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AiGatewayRelayRequest } from '../models/AiGatewayRelayRequest';
import type { ApiResultString } from '../models/ApiResultString';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AiGatewayControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 统一AI中转
     * 按 model 路由到目标模型并透传 prompt
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public relay(
        requestBody: AiGatewayRelayRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/gateway/relay',
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
}
