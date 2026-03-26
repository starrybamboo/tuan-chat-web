import { tuanchat } from "api/instance";

export async function listBlocksuiteSpaceMemberIds(spaceId: number): Promise<number[]> {
  if (!Number.isFinite(spaceId) || spaceId <= 0)
    return [];

  const response = await tuanchat.spaceMemberController.getMemberList(spaceId);
  const members = (response.data ?? []).filter(member => member.userId != null);

  return members
    .map(member => Number(member.userId))
    .filter(id => Number.isFinite(id) && id > 0);
}
