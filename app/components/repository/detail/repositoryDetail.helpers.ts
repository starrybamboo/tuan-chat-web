import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Space } from "@tuanchat/openapi-client/models/Space";

export type RepositorySpaceCandidate = Space & { spaceId: number };

export type RepositoryPrimaryAction
  = | { kind: "continue"; space: RepositorySpaceCandidate }
    | { kind: "recover"; space: RepositorySpaceCandidate }
    | { kind: "clone" };

export function isValidSpaceId(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isValidCommitId(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function parseSpaceUpdateTime(value?: string): number {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function listRepositorySpaceCandidates(spaces: Space[], repositoryId: number): RepositorySpaceCandidate[] {
  if (!isValidSpaceId(repositoryId)) {
    return [];
  }
  return spaces
    .filter((space): space is RepositorySpaceCandidate => space.repositoryId === repositoryId && isValidSpaceId(space.spaceId))
    .sort((a, b) => parseSpaceUpdateTime(b.updateTime) - parseSpaceUpdateTime(a.updateTime));
}

export function findRecoverableRepositorySpace(
  spaces: RepositorySpaceCandidate[],
  latestRepositoryCommitId: number | null,
): RepositorySpaceCandidate | null {
  const archivedSpaces = spaces.filter(space => space.status === 2);
  if (archivedSpaces.length === 0) {
    return null;
  }

  if (isValidCommitId(latestRepositoryCommitId)) {
    const exactCommitSpace = archivedSpaces.find(space => space.parentCommitId === latestRepositoryCommitId);
    if (exactCommitSpace) {
      return exactCommitSpace;
    }
  }

  return archivedSpaces[0] ?? null;
}

export function resolveRepositoryPrimaryAction(params: {
  linkedSpace: RepositorySpaceCandidate | null;
  recoverableSpace: RepositorySpaceCandidate | null;
}): RepositoryPrimaryAction {
  const { linkedSpace, recoverableSpace } = params;
  if (linkedSpace && linkedSpace.status !== 2) {
    return { kind: "continue", space: linkedSpace };
  }
  if (recoverableSpace) {
    return { kind: "recover", space: recoverableSpace };
  }
  return { kind: "clone" };
}

export function resolvePreviewRoomId(rooms: Room[], selectedRoomId: number | null): number | null {
  if (selectedRoomId != null && rooms.some(room => room.roomId === selectedRoomId)) {
    return selectedRoomId;
  }
  return rooms.find(room => isValidSpaceId(room.roomId))?.roomId ?? null;
}
