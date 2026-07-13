import type { RoomMemberAddRequest } from "@tuanchat/openapi-client/models/RoomMemberAddRequest";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type RoomMemberClient = Pick<TuanChat, "roomMemberController">;

export async function addRoomMemberWithSuccessGuard(client: RoomMemberClient, request: RoomMemberAddRequest) {
  const result = await client.roomMemberController.addMember1(request);
  if (result.success !== true) {
    throw new Error(result.errMsg?.trim() || "添加频道成员失败。");
  }
  return result;
}
