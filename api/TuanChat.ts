/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { FetchHttpRequest } from './core/FetchHttpRequest';
import { Service } from './services/Service';
import { AbilityControllerService } from './services/AbilityControllerService';
import { AvatarControllerService } from './services/AvatarControllerService';
import { ChatControllerService } from './services/ChatControllerService';
import { DiceCommentControllerService } from './services/DiceCommentControllerService';
import { FeedControllerService } from './services/FeedControllerService';
import { ImageGenerationControllerService } from './services/ImageGenerationControllerService';
import { OssControllerService } from './services/OssControllerService';
import { RoleControllerService } from './services/RoleControllerService';
import { RoleGenerationControllerService } from './services/RoleGenerationControllerService';
import { RoomControllerService } from './services/RoomControllerService';
import { RoomMemberControllerService } from './services/RoomMemberControllerService';
import { RoomRoleControllerService } from './services/RoomRoleControllerService';
import { RuleControllerService } from './services/RuleControllerService';
import { SpaceControllerService } from './services/SpaceControllerService';
import { SpaceMemberControllerService } from './services/SpaceMemberControllerService';
import { SpaceRoleControllerService } from './services/SpaceRoleControllerService';
import { TtsControllerService } from './services/TtsControllerService';
import { UserControllerService } from './services/UserControllerService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class TuanChat {
    public readonly service : Service;
    public readonly abilityController: AbilityControllerService;
    public readonly avatarController: AvatarControllerService;
    public readonly chatController: ChatControllerService;
    public readonly diceCommentController: DiceCommentControllerService;
    public readonly feedController: FeedControllerService;
    public readonly imageGenerationController: ImageGenerationControllerService;
    public readonly ossController: OssControllerService;
    public readonly roleController: RoleControllerService;
    public readonly roleGenerationController: RoleGenerationControllerService;
    public readonly roomController: RoomControllerService;
    public readonly roomMemberController: RoomMemberControllerService;
    public readonly roomRoleController: RoomRoleControllerService;
    public readonly ruleController: RuleControllerService;
    public readonly spaceController: SpaceControllerService;
    public readonly spaceMemberController: SpaceMemberControllerService;
    public readonly spaceRoleController: SpaceRoleControllerService;
    public readonly ttsController: TtsControllerService;
    public readonly userController: UserControllerService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
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
        this.service = new Service(this.request);
        this.abilityController = new AbilityControllerService(this.request);
        this.avatarController = new AvatarControllerService(this.request);
        this.chatController = new ChatControllerService(this.request);
        this.diceCommentController = new DiceCommentControllerService(this.request);
        this.feedController = new FeedControllerService(this.request);
        this.imageGenerationController = new ImageGenerationControllerService(this.request);
        this.ossController = new OssControllerService(this.request);
        this.roleController = new RoleControllerService(this.request);
        this.roleGenerationController = new RoleGenerationControllerService(this.request);
        this.roomController = new RoomControllerService(this.request);
        this.roomMemberController = new RoomMemberControllerService(this.request);
        this.roomRoleController = new RoomRoleControllerService(this.request);
        this.ruleController = new RuleControllerService(this.request);
        this.spaceController = new SpaceControllerService(this.request);
        this.spaceMemberController = new SpaceMemberControllerService(this.request);
        this.spaceRoleController = new SpaceRoleControllerService(this.request);
        this.ttsController = new TtsControllerService(this.request);
        this.userController = new UserControllerService(this.request);
    }
}

