export type CreateRoomNameDraft = string | null;

type CreateRoomNameInputState = {
  canSubmitRoomName: boolean;
  roomName: string;
};

export function resolveCreateRoomNameInputState(
  defaultRoomName: string,
  roomNameDraft: CreateRoomNameDraft,
): CreateRoomNameInputState {
  const roomName = roomNameDraft ?? defaultRoomName;

  return {
    canSubmitRoomName: roomName.trim().length > 0,
    roomName,
  };
}

export function createRoomNameDraftFromInput(inputValue: string): CreateRoomNameDraft {
  return inputValue;
}
