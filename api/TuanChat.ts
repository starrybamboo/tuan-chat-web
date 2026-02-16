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
import { BlocksuiteDocControllerService } from './services/BlocksuiteDocControllerService';
import { ChatControllerService } from './services/ChatControllerService';
import { ClassificationControllerService } from './services/ClassificationControllerService';
import { CollectionControllerService } from './services/CollectionControllerService';
import { CollectionListControllerService } from './services/CollectionListControllerService';
import { CollectionListItemControllerService } from './services/CollectionListItemControllerService';
import { CommentControllerService } from './services/CommentControllerService';
import { CommunityService } from './services/CommunityService';
import { CommunityPostControllerService } from './services/CommunityPostControllerService';
import { CounterService } from './services/CounterService';
import { DatabaseBackupService } from './services/DatabaseBackupService';
import { FeedControllerService } from './services/FeedControllerService';
import { FriendControllerService } from './services/FriendControllerService';
import { MarkControllerService } from './services/MarkControllerService';
import { MessageDirectControllerService } from './services/MessageDirectControllerService';
import { MessageSessionService } from './services/MessageSessionService';
import { OssControllerService } from './services/OssControllerService';
import { RatingService } from './services/RatingService';
import { RepositoryControllerService } from './services/RepositoryControllerService';
import { ResourceControllerService } from './services/ResourceControllerService';
import { RoleControllerService } from './services/RoleControllerService';
import { RoomControllerService } from './services/RoomControllerService';
import { RoomDndMapControllerService } from './services/RoomDndMapControllerService';
import { RoomMemberControllerService } from './services/RoomMemberControllerService';
import { RoomRoleControllerService } from './services/RoomRoleControllerService';
import { RuleControllerService } from './services/RuleControllerService';
import { ShortLinkControllerService } from './services/ShortLinkControllerService';
import { SpaceControllerService } from './services/SpaceControllerService';
import { SpaceDocControllerService } from './services/SpaceDocControllerService';
import { SpaceMemberControllerService } from './services/SpaceMemberControllerService';
import { SpaceRepositoryControllerService } from './services/SpaceRepositoryControllerService';
import { SpaceSidebarTreeControllerService } from './services/SpaceSidebarTreeControllerService';
import { SpaceUserDocControllerService } from './services/SpaceUserDocControllerService';
import { StickerControllerService } from './services/StickerControllerService';
import { TagControllerService } from './services/TagControllerService';
import { UserControllerService } from './services/UserControllerService';
import { UserFollowControllerService } from './services/UserFollowControllerService';
import { WebsocketDocService } from './services/WebsocketDocService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class TuanChat {
    public readonly abilityController: AbilityControllerService;
    public readonly aiGatewayController: AiGatewayControllerService;
    public readonly aiGatewayOpenAiController: AiGatewayOpenAiControllerService;
    public readonly avatarController: AvatarControllerService;
    public readonly blocksuiteDocController: BlocksuiteDocControllerService;
    public readonly chatController: ChatControllerService;
    public readonly classificationController: ClassificationControllerService;
    public readonly collectionController: CollectionControllerService;
    public readonly collectionListController: CollectionListControllerService;
    public readonly collectionListItemController: CollectionListItemControllerService;
    public readonly commentController: CommentControllerService;
    public readonly community: CommunityService;
    public readonly communityPostController: CommunityPostControllerService;
    public readonly counter: CounterService;
    public readonly databaseBackup: DatabaseBackupService;
    public readonly feedController: FeedControllerService;
    public readonly friendController: FriendControllerService;
    public readonly markController: MarkControllerService;
    public readonly messageDirectController: MessageDirectControllerService;
    public readonly messageSession: MessageSessionService;
    public readonly ossController: OssControllerService;
    public readonly rating: RatingService;
    public readonly repositoryController: RepositoryControllerService;
    public readonly resourceController: ResourceControllerService;
    public readonly roleController: RoleControllerService;
    public readonly roomController: RoomControllerService;
    public readonly roomDndMapController: RoomDndMapControllerService;
    public readonly roomMemberController: RoomMemberControllerService;
    public readonly roomRoleController: RoomRoleControllerService;
    public readonly ruleController: RuleControllerService;
    public readonly shortLinkController: ShortLinkControllerService;
    public readonly spaceController: SpaceControllerService;
    public readonly spaceDocController: SpaceDocControllerService;
    public readonly spaceMemberController: SpaceMemberControllerService;
    public readonly spaceRepositoryController: SpaceRepositoryControllerService;
    public readonly spaceSidebarTreeController: SpaceSidebarTreeControllerService;
    public readonly spaceUserDocController: SpaceUserDocControllerService;
    public readonly stickerController: StickerControllerService;
    public readonly tagController: TagControllerService;
    public readonly userController: UserControllerService;
    public readonly userFollowController: UserFollowControllerService;
    public readonly websocketDoc: WebsocketDocService;
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
        this.abilityController = new AbilityControllerService(this.request);
        this.aiGatewayController = new AiGatewayControllerService(this.request);
        this.aiGatewayOpenAiController = new AiGatewayOpenAiControllerService(this.request);
        this.avatarController = new AvatarControllerService(this.request);
        this.blocksuiteDocController = new BlocksuiteDocControllerService(this.request);
        this.chatController = new ChatControllerService(this.request);
        this.classificationController = new ClassificationControllerService(this.request);
        this.collectionController = new CollectionControllerService(this.request);
        this.collectionListController = new CollectionListControllerService(this.request);
        this.collectionListItemController = new CollectionListItemControllerService(this.request);
        this.commentController = new CommentControllerService(this.request);
        this.community = new CommunityService(this.request);
        this.communityPostController = new CommunityPostControllerService(this.request);
        this.counter = new CounterService(this.request);
        this.databaseBackup = new DatabaseBackupService(this.request);
        this.feedController = new FeedControllerService(this.request);
        this.friendController = new FriendControllerService(this.request);
        this.markController = new MarkControllerService(this.request);
        this.messageDirectController = new MessageDirectControllerService(this.request);
        this.messageSession = new MessageSessionService(this.request);
        this.ossController = new OssControllerService(this.request);
        this.rating = new RatingService(this.request);
        this.repositoryController = new RepositoryControllerService(this.request);
        this.resourceController = new ResourceControllerService(this.request);
        this.roleController = new RoleControllerService(this.request);
        this.roomController = new RoomControllerService(this.request);
        this.roomDndMapController = new RoomDndMapControllerService(this.request);
        this.roomMemberController = new RoomMemberControllerService(this.request);
        this.roomRoleController = new RoomRoleControllerService(this.request);
        this.ruleController = new RuleControllerService(this.request);
        this.shortLinkController = new ShortLinkControllerService(this.request);
        this.spaceController = new SpaceControllerService(this.request);
        this.spaceDocController = new SpaceDocControllerService(this.request);
        this.spaceMemberController = new SpaceMemberControllerService(this.request);
        this.spaceRepositoryController = new SpaceRepositoryControllerService(this.request);
        this.spaceSidebarTreeController = new SpaceSidebarTreeControllerService(this.request);
        this.spaceUserDocController = new SpaceUserDocControllerService(this.request);
        this.stickerController = new StickerControllerService(this.request);
        this.tagController = new TagControllerService(this.request);
        this.userController = new UserControllerService(this.request);
        this.userFollowController = new UserFollowControllerService(this.request);
        this.websocketDoc = new WebsocketDocService(this.request);
    }
}

