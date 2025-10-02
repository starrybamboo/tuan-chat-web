/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SimpleTTSRequest } from '../models/SimpleTTSRequest';
import type { TTSResponse } from '../models/TTSResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class TtsControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 语音合成
     * 使用hobbyistAPI将文本转换为语音，这个是第三方，免费的API，轻点！
     * @param requestBody
     * @returns TTSResponse 成功返回语音文件信息
     * @throws ApiError
     */
    public textToVoiceHobbyist(
        requestBody: SimpleTTSRequest,
    ): CancelablePromise<TTSResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/tts/hobbyist',
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
