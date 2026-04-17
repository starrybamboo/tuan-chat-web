/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AiGatewayRelayRequest } from '../models/AiGatewayRelayRequest';
import type { ApiResultAiGatewayModelCatalogResponse } from '../models/ApiResultAiGatewayModelCatalogResponse';
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
        });
    }
    /**
     * 查询AI模型目录
     * 按场景返回可用模型；scene 为空时返回全量模型目录
     * @param scene
     * @returns ApiResultAiGatewayModelCatalogResponse OK
     * @throws ApiError
     */
    public listModels(
        scene?: string,
    ): CancelablePromise<ApiResultAiGatewayModelCatalogResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/ai/gateway/models',
            query: {
                'scene': scene,
            },
        });
    }
}
