import { getLocalValue, setLocalValue } from "@/components/chat/infra/localDb/chatHistoryDb";

type ComposerAnnotationsRow = {
  key: string;
  roomId: number;
  roleId: number;
  annotations: string[];
  updatedAt: number;
};

const KV_KEY_PREFIX = "composer-annotations:";

function makeKey(roomId: number, roleId: number) {
  return `${KV_KEY_PREFIX}${roomId}:${roleId}`;
}

export async function getComposerAnnotations(params: {
  roomId: number;
  roleId: number;
}): Promise<string[] | null> {
  const row = await getLocalValue<ComposerAnnotationsRow>(makeKey(params.roomId, params.roleId));
  return row?.annotations ?? null;
}

export async function setComposerAnnotations(params: {
  roomId: number;
  roleId: number;
  annotations: string[];
}): Promise<void> {
  const key = makeKey(params.roomId, params.roleId);
  await setLocalValue(key, {
    key,
    roomId: params.roomId,
    roleId: params.roleId,
    annotations: params.annotations,
    updatedAt: Date.now(),
  } satisfies ComposerAnnotationsRow);
}
