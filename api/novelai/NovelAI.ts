/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { FetchHttpRequest } from './core/FetchHttpRequest';
import { Service } from './services/Service';
import { AiService } from './services/AiService';
import { AiModuleService } from './services/AiModuleService';
import { UserService } from './services/UserService';
import { UserSubscriptionService } from './services/UserSubscriptionService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class NovelAI {
    public readonly : Service;
    public readonly ai: AiService;
    public readonly aiModule: AiModuleService;
    public readonly user: UserService;
    public readonly userSubscription: UserSubscriptionService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? '',
            VERSION: config?.VERSION ?? '1.0',
            WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
            CREDENTIALS: config?.CREDENTIALS ?? 'include',
            TOKEN: config?.TOKEN,
            USERNAME: config?.USERNAME,
            PASSWORD: config?.PASSWORD,
            HEADERS: config?.HEADERS,
            ENCODE_PATH: config?.ENCODE_PATH,
        });
        this. = new Service(this.request);
        this.ai = new AiService(this.request);
        this.aiModule = new AiModuleService(this.request);
        this.user = new UserService(this.request);
        this.userSubscription = new UserSubscriptionService(this.request);
    }
}

