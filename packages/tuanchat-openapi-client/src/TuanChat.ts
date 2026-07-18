/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { FetchHttpRequest } from './core/FetchHttpRequest';
import { AbilityControllerService } from './services/AbilityControllerService';
import { AiGatewayControllerService } from './services/AiGatewayControllerService';
import { AiGatewayOpenAiControllerService } from './services/AiGatewayOpenAiControllerService';
import { AvatarControllerService } from './services/AvatarControllerService';
import { ChatControllerService } from './services/ChatControllerService';
import { ClientMetadataControllerService } from './services/ClientMetadataControllerService';
import { CommentControllerService } from './services/CommentControllerService';
import { CounterService } from './services/CounterService';
import { DatabaseBackupService } from './services/DatabaseBackupService';
import { FeedbackIssueControllerService } from './services/FeedbackIssueControllerService';
import { FeedControllerService } from './services/FeedControllerService';
import { FriendControllerService } from './services/FriendControllerService';
import { MaterialPackageControllerService } from './services/MaterialPackageControllerService';
import { MediaControllerService } from './services/MediaControllerService';
import { MessageDirectControllerService } from './services/MessageDirectControllerService';
import { MessageSessionService } from './services/MessageSessionService';
import { NotificationControllerService } from './services/NotificationControllerService';
import { NovelApiProxyControllerService } from './services/NovelApiProxyControllerService';
import { OssControllerService } from './services/OssControllerService';
import { RepositoryControllerService } from './services/RepositoryControllerService';
import { RoleControllerService } from './services/RoleControllerService';
import { RoomControllerService } from './services/RoomControllerService';
import { RoomDndMapControllerService } from './services/RoomDndMapControllerService';
import { RoomMemberControllerService } from './services/RoomMemberControllerService';
import { RoomRoleControllerService } from './services/RoomRoleControllerService';
import { RuleControllerService } from './services/RuleControllerService';
import { SpaceControllerService } from './services/SpaceControllerService';
import { SpaceDocControllerService } from './services/SpaceDocControllerService';
import { SpaceMaterialPackageControllerService } from './services/SpaceMaterialPackageControllerService';
import { SpaceMemberControllerService } from './services/SpaceMemberControllerService';
import { SpaceRepositoryControllerService } from './services/SpaceRepositoryControllerService';
import { SpaceSidebarTreeControllerService } from './services/SpaceSidebarTreeControllerService';
import { SpaceTutorialControllerService } from './services/SpaceTutorialControllerService';
import { StickerControllerService } from './services/StickerControllerService';
import { UserControllerService } from './services/UserControllerService';
import { UserFollowControllerService } from './services/UserFollowControllerService';
import { UserSecurityControllerService } from './services/UserSecurityControllerService';
import { WebgalPublishControllerService } from './services/WebgalPublishControllerService';
import { WebsocketDocService } from './services/WebsocketDocService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class TuanChat {
    public readonly abilityController: AbilityControllerService;
    public readonly aiGatewayController: AiGatewayControllerService;
    public readonly aiGatewayOpenAiController: AiGatewayOpenAiControllerService;
    public readonly avatarController: AvatarControllerService;
    public readonly chatController: ChatControllerService;
    public readonly clientMetadataController: ClientMetadataControllerService;
    public readonly commentController: CommentControllerService;
    public readonly counter: CounterService;
    public readonly databaseBackup: DatabaseBackupService;
    public readonly feedbackIssueController: FeedbackIssueControllerService;
    public readonly feedController: FeedControllerService;
    public readonly friendController: FriendControllerService;
    public readonly materialPackageController: MaterialPackageControllerService;
    public readonly mediaController: MediaControllerService;
    public readonly messageDirectController: MessageDirectControllerService;
    public readonly messageSession: MessageSessionService;
    public readonly notificationController: NotificationControllerService;
    public readonly novelApiProxyController: NovelApiProxyControllerService;
    public readonly ossController: OssControllerService;
    public readonly repositoryController: RepositoryControllerService;
    public readonly roleController: RoleControllerService;
    public readonly roomController: RoomControllerService;
    public readonly roomDndMapController: RoomDndMapControllerService;
    public readonly roomMemberController: RoomMemberControllerService;
    public readonly roomRoleController: RoomRoleControllerService;
    public readonly ruleController: RuleControllerService;
    public readonly spaceController: SpaceControllerService;
    public readonly spaceDocController: SpaceDocControllerService;
    public readonly spaceMaterialPackageController: SpaceMaterialPackageControllerService;
    public readonly spaceMemberController: SpaceMemberControllerService;
    public readonly spaceRepositoryController: SpaceRepositoryControllerService;
    public readonly spaceSidebarTreeController: SpaceSidebarTreeControllerService;
    public readonly spaceTutorialController: SpaceTutorialControllerService;
    public readonly stickerController: StickerControllerService;
    public readonly userController: UserControllerService;
    public readonly userFollowController: UserFollowControllerService;
    public readonly userSecurityController: UserSecurityControllerService;
    public readonly webgalPublishController: WebgalPublishControllerService;
    public readonly websocketDoc: WebsocketDocService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? 'http://127.0.0.1:8081',
            VERSION: config?.VERSION ?? '1.0',
            WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
            CREDENTIALS: config?.CREDENTIALS ?? 'include',
            TOKEN: config?.TOKEN,
            USERNAME: config?.USERNAME,
            PASSWORD: config?.PASSWORD,
            HEADERS: config?.HEADERS,
            ENCODE_PATH: config?.ENCODE_PATH,
        });
        this.abilityController = new AbilityControllerService(this.request);
        this.aiGatewayController = new AiGatewayControllerService(this.request);
        this.aiGatewayOpenAiController = new AiGatewayOpenAiControllerService(this.request);
        this.avatarController = new AvatarControllerService(this.request);
        this.chatController = new ChatControllerService(this.request);
        this.clientMetadataController = new ClientMetadataControllerService(this.request);
        this.commentController = new CommentControllerService(this.request);
        this.counter = new CounterService(this.request);
        this.databaseBackup = new DatabaseBackupService(this.request);
        this.feedbackIssueController = new FeedbackIssueControllerService(this.request);
        this.feedController = new FeedControllerService(this.request);
        this.friendController = new FriendControllerService(this.request);
        this.materialPackageController = new MaterialPackageControllerService(this.request);
        this.mediaController = new MediaControllerService(this.request);
        this.messageDirectController = new MessageDirectControllerService(this.request);
        this.messageSession = new MessageSessionService(this.request);
        this.notificationController = new NotificationControllerService(this.request);
        this.novelApiProxyController = new NovelApiProxyControllerService(this.request);
        this.ossController = new OssControllerService(this.request);
        this.repositoryController = new RepositoryControllerService(this.request);
        this.roleController = new RoleControllerService(this.request);
        this.roomController = new RoomControllerService(this.request);
        this.roomDndMapController = new RoomDndMapControllerService(this.request);
        this.roomMemberController = new RoomMemberControllerService(this.request);
        this.roomRoleController = new RoomRoleControllerService(this.request);
        this.ruleController = new RuleControllerService(this.request);
        this.spaceController = new SpaceControllerService(this.request);
        this.spaceDocController = new SpaceDocControllerService(this.request);
        this.spaceMaterialPackageController = new SpaceMaterialPackageControllerService(this.request);
        this.spaceMemberController = new SpaceMemberControllerService(this.request);
        this.spaceRepositoryController = new SpaceRepositoryControllerService(this.request);
        this.spaceSidebarTreeController = new SpaceSidebarTreeControllerService(this.request);
        this.spaceTutorialController = new SpaceTutorialControllerService(this.request);
        this.stickerController = new StickerControllerService(this.request);
        this.userController = new UserControllerService(this.request);
        this.userFollowController = new UserFollowControllerService(this.request);
        this.userSecurityController = new UserSecurityControllerService(this.request);
        this.webgalPublishController = new WebgalPublishControllerService(this.request);
        this.websocketDoc = new WebsocketDocService(this.request);
    }
}
