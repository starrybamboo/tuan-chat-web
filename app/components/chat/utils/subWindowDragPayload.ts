export type SubWindowDragPayload
  = | { tab: "room"; roomId: number }
    | { tab: "doc"; docId: string }
    | { tab: "material"; spacePackageId: number; materialPathKey?: string | null };

let currentSubWindowDragPayload: SubWindowDragPayload | null = null;

export function setSubWindowDragPayload(payload: SubWindowDragPayload | null): void {
  currentSubWindowDragPayload = payload;
}

export function getSubWindowDragPayload(): SubWindowDragPayload | null {
  return currentSubWindowDragPayload;
}
