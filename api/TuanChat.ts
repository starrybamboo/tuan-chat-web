/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenApi';
import { AxiosHttpRequest } from './core/AxiosHttpRequest';
import { AvatarControllerService } from './services/AvatarControllerService';
import { ChatControllerService } from './services/ChatControllerService';
import { GroupControllerService } from './services/GroupControllerService';
import { GroupMemberControllerService } from './services/GroupMemberControllerService';
import { GroupRoleControllerService } from './services/GroupRoleControllerService';
import { OssControllerService } from './services/OssControllerService';
import { RoleControllerService } from './services/RoleControllerService';
import { UserControllerService } from './services/UserControllerService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class TuanChat {
    public readonly avatarController: AvatarControllerService;
    public readonly chatController: ChatControllerService;
    public readonly groupController: GroupControllerService;
    public readonly groupMemberController: GroupMemberControllerService;
    public readonly groupRoleController: GroupRoleControllerService;
    public readonly ossController: OssControllerService;
    public readonly roleController: RoleControllerService;
    public readonly userController: UserControllerService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = AxiosHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? 'http://localhost:8081',
            VERSION: config?.VERSION ?? '1.0',
            WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
            CREDENTIALS: config?.CREDENTIALS ?? 'include',
            TOKEN: config?.TOKEN,
            USERNAME: config?.USERNAME,
            PASSWORD: config?.PASSWORD,
            HEADERS: config?.HEADERS,
            ENCODE_PATH: config?.ENCODE_PATH,
        });
        this.avatarController = new AvatarControllerService(this.request);
        this.chatController = new ChatControllerService(this.request);
        this.groupController = new GroupControllerService(this.request);
        this.groupMemberController = new GroupMemberControllerService(this.request);
        this.groupRoleController = new GroupRoleControllerService(this.request);
        this.ossController = new OssControllerService(this.request);
        this.roleController = new RoleControllerService(this.request);
        this.userController = new UserControllerService(this.request);
    }
}

