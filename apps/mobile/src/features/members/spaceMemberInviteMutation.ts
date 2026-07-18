import type { ApiResultVoid } from "@tuanchat/openapi-client/models/ApiResultVoid";
import type { PlayerGrantRequest } from "@tuanchat/openapi-client/models/PlayerGrantRequest";
import type { SpaceMemberAddRequest } from "@tuanchat/openapi-client/models/SpaceMemberAddRequest";

type SpaceMemberInviteClient = {
  addMember: (request: SpaceMemberAddRequest) => PromiseLike<ApiResultVoid>;
  grantPlayer: (request: PlayerGrantRequest) => PromiseLike<ApiResultVoid>;
};

type InviteSpaceMemberOptions = {
  inviteAsPlayer: boolean;
  spaceId: number;
  userId: number;
};

/** 邀请观战成员；玩家邀请在加入空间后继续授予玩家身份。 */
export async function inviteSpaceMember(
  client: SpaceMemberInviteClient,
  { inviteAsPlayer, spaceId, userId }: InviteSpaceMemberOptions,
) {
  const addResponse = await client.addMember({
    spaceId,
    userIdList: [userId],
  });
  if (!addResponse.success) {
    throw new Error(addResponse.errMsg || "邀请空间成员失败。");
  }

  if (!inviteAsPlayer) {
    return;
  }

  const grantResponse = await client.grantPlayer({
    spaceId,
    uidList: [userId],
  });
  if (!grantResponse.success) {
    throw new Error(grantResponse.errMsg || "授予玩家身份失败。");
  }
}
