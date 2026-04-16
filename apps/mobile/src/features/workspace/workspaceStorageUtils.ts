export type StoredWorkspaceSelection = {
  selectedSpaceId?: number;
  selectedRoomId?: number;
};

function toPositiveId(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function sanitizeStoredWorkspaceSelection(input: unknown): StoredWorkspaceSelection | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const parsed = input as Partial<StoredWorkspaceSelection>;
  const selectedSpaceId = toPositiveId(parsed.selectedSpaceId);
  const selectedRoomId = selectedSpaceId ? toPositiveId(parsed.selectedRoomId) : undefined;

  if (!selectedSpaceId) {
    return null;
  }

  return {
    selectedSpaceId,
    selectedRoomId,
  };
}
