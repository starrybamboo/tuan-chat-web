/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { FetchHttpRequest } from './core/FetchHttpRequest';
import { AbilityControllerService } from './services/AbilityControllerService';
import { AiReportControllerService } from './services/AiReportControllerService';
import { AiWritingControllerService } from './services/AiWritingControllerService';
import { AvatarControllerService } from './services/AvatarControllerService';
import { ChatControllerService } from './services/ChatControllerService';
import { CollectionControllerService } from './services/CollectionControllerService';
import { CollectionListControllerService } from './services/CollectionListControllerService';
import { CollectionListItemControllerService } from './services/CollectionListItemControllerService';
import { CommentControllerService } from './services/CommentControllerService';
import { CommitControllerService } from './services/CommitControllerService';
import { CommunityService } from './services/CommunityService';
import { CommunityMemberService } from './services/CommunityMemberService';
import { CommunityPostService } from './services/CommunityPostService';
import { CounterService } from './services/CounterService';
import { DiceCommentControllerService } from './services/DiceCommentControllerService';
import { EmojiControllerService } from './services/EmojiControllerService';
import { FeedControllerService } from './services/FeedControllerService';
import { ImageGenerationControllerService } from './services/ImageGenerationControllerService';
import { ItemControllerService } from './services/ItemControllerService';
import { LikeRecordControllerService } from './services/LikeRecordControllerService';
import { MessageDirectControllerService } from './services/MessageDirectControllerService';
import { MessageSessionService } from './services/MessageSessionService';
import { ModuleControllerService } from './services/ModuleControllerService';
import { OssControllerService } from './services/OssControllerService';
import { RatingService } from './services/RatingService';
import { RoleControllerService } from './services/RoleControllerService';
import { RoleGenerationControllerService } from './services/RoleGenerationControllerService';
import { RoomControllerService } from './services/RoomControllerService';
import { RoomMemberControllerService } from './services/RoomMemberControllerService';
import { RoomRoleControllerService } from './services/RoomRoleControllerService';
import { RuleControllerService } from './services/RuleControllerService';
import { ScTransactionsService } from './services/ScTransactionsService';
import { ScWalletsService } from './services/ScWalletsService';
import { ShortLinkControllerService } from './services/ShortLinkControllerService';
import { SpaceControllerService } from './services/SpaceControllerService';
import { SpaceMemberControllerService } from './services/SpaceMemberControllerService';
import { SpaceModuleControllerService } from './services/SpaceModuleControllerService';
import { StageControllerService } from './services/StageControllerService';
import { TagControllerService } from './services/TagControllerService';
import { TtsControllerService } from './services/TtsControllerService';
import { UserControllerService } from './services/UserControllerService';
import { UserFollowControllerService } from './services/UserFollowControllerService';
import { UserPreferenceService } from './services/UserPreferenceService';
import { WebsocketDocService } from './services/WebsocketDocService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class TuanChat {
    public readonly abilityController: AbilityControllerService;
    public readonly aiReportController: AiReportControllerService;
    public readonly aiWritingController: AiWritingControllerService;
    public readonly avatarController: AvatarControllerService;
    public readonly chatController: ChatControllerService;
    public readonly collectionController: CollectionControllerService;
    public readonly collectionListController: CollectionListControllerService;
    public readonly collectionListItemController: CollectionListItemControllerService;
    public readonly commentController: CommentControllerService;
    public readonly commitController: CommitControllerService;
    public readonly community: CommunityService;
    public readonly communityMember: CommunityMemberService;
    public readonly communityPost: CommunityPostService;
    public readonly counter: CounterService;
    public readonly diceCommentController: DiceCommentControllerService;
    public readonly emojiController: EmojiControllerService;
    public readonly feedController: FeedControllerService;
    public readonly imageGenerationController: ImageGenerationControllerService;
    public readonly itemController: ItemControllerService;
    public readonly likeRecordController: LikeRecordControllerService;
    public readonly messageDirectController: MessageDirectControllerService;
    public readonly messageSession: MessageSessionService;
    public readonly moduleController: ModuleControllerService;
    public readonly ossController: OssControllerService;
    public readonly rating: RatingService;
    public readonly roleController: RoleControllerService;
    public readonly roleGenerationController: RoleGenerationControllerService;
    public readonly roomController: RoomControllerService;
    public readonly roomMemberController: RoomMemberControllerService;
    public readonly roomRoleController: RoomRoleControllerService;
    public readonly ruleController: RuleControllerService;
    public readonly scTransactions: ScTransactionsService;
    public readonly scWallets: ScWalletsService;
    public readonly shortLinkController: ShortLinkControllerService;
    public readonly spaceController: SpaceControllerService;
    public readonly spaceMemberController: SpaceMemberControllerService;
    public readonly spaceModuleController: SpaceModuleControllerService;
    public readonly stageController: StageControllerService;
    public readonly tagController: TagControllerService;
    public readonly ttsController: TtsControllerService;
    public readonly userController: UserControllerService;
    public readonly userFollowController: UserFollowControllerService;
    public readonly userPreference: UserPreferenceService;
    public readonly websocketDoc: WebsocketDocService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? 'http://39.103.58.31:8081',
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
        this.aiReportController = new AiReportControllerService(this.request);
        this.aiWritingController = new AiWritingControllerService(this.request);
        this.avatarController = new AvatarControllerService(this.request);
        this.chatController = new ChatControllerService(this.request);
        this.collectionController = new CollectionControllerService(this.request);
        this.collectionListController = new CollectionListControllerService(this.request);
        this.collectionListItemController = new CollectionListItemControllerService(this.request);
        this.commentController = new CommentControllerService(this.request);
        this.commitController = new CommitControllerService(this.request);
        this.community = new CommunityService(this.request);
        this.communityMember = new CommunityMemberService(this.request);
        this.communityPost = new CommunityPostService(this.request);
        this.counter = new CounterService(this.request);
        this.diceCommentController = new DiceCommentControllerService(this.request);
        this.emojiController = new EmojiControllerService(this.request);
        this.feedController = new FeedControllerService(this.request);
        this.imageGenerationController = new ImageGenerationControllerService(this.request);
        this.itemController = new ItemControllerService(this.request);
        this.likeRecordController = new LikeRecordControllerService(this.request);
        this.messageDirectController = new MessageDirectControllerService(this.request);
        this.messageSession = new MessageSessionService(this.request);
        this.moduleController = new ModuleControllerService(this.request);
        this.ossController = new OssControllerService(this.request);
        this.rating = new RatingService(this.request);
        this.roleController = new RoleControllerService(this.request);
        this.roleGenerationController = new RoleGenerationControllerService(this.request);
        this.roomController = new RoomControllerService(this.request);
        this.roomMemberController = new RoomMemberControllerService(this.request);
        this.roomRoleController = new RoomRoleControllerService(this.request);
        this.ruleController = new RuleControllerService(this.request);
        this.scTransactions = new ScTransactionsService(this.request);
        this.scWallets = new ScWalletsService(this.request);
        this.shortLinkController = new ShortLinkControllerService(this.request);
        this.spaceController = new SpaceControllerService(this.request);
        this.spaceMemberController = new SpaceMemberControllerService(this.request);
        this.spaceModuleController = new SpaceModuleControllerService(this.request);
        this.stageController = new StageControllerService(this.request);
        this.tagController = new TagControllerService(this.request);
        this.ttsController = new TtsControllerService(this.request);
        this.userController = new UserControllerService(this.request);
        this.userFollowController = new UserFollowControllerService(this.request);
        this.userPreference = new UserPreferenceService(this.request);
        this.websocketDoc = new WebsocketDocService(this.request);
    }
}

