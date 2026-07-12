import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarLeafNode } from "./sidebarTree";

import { Button } from "@/components/common/Button";
import { SelectInput } from "@/components/common/FormField";

type RoomSidebarAddPanelProps = {
  categoryId: string;
  isSpaceOwner: boolean;
  pendingAddRoomId: number | null;
  setPendingAddRoomId: (next: number | null) => void;
  pendingAddDocId: string;
  setPendingAddDocId: (next: string) => void;
  addNode: (categoryId: string, node: SidebarLeafNode) => void;
  fallbackTextRooms: Room[];
  existingRoomIdsInTree: Set<number>;
  visibleDocMetas: MinimalDocMeta[];
  existingDocIdsInTree: Set<string>;
  setAddPanelCategoryId: (next: string | null) => void;
}

export default function RoomSidebarAddPanel({
  categoryId,
  isSpaceOwner,
  pendingAddRoomId,
  setPendingAddRoomId,
  pendingAddDocId,
  setPendingAddDocId,
  addNode,
  fallbackTextRooms,
  existingRoomIdsInTree,
  visibleDocMetas,
  existingDocIdsInTree,
  setAddPanelCategoryId,
}: RoomSidebarAddPanelProps) {
  return (
    <div className="mt-1 p-2 border-t border-base-300">
      <div className="flex items-center gap-2">
        <SelectInput
          density="compact"
          className="flex-1"
          aria-label="添加房间"
          value={pendingAddRoomId ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            setPendingAddRoomId(v ? Number(v) : null);
          }}
        >
          <option value="">添加房间…</option>
          {fallbackTextRooms
            .filter(r => typeof r.roomId === "number" && Number.isFinite(r.roomId))
            .filter(r => !existingRoomIdsInTree.has(r.roomId as number))
            .map(r => (
              <option key={r.roomId} value={r.roomId}>
                {r.name ?? String(r.roomId)}
              </option>
            ))}
        </SelectInput>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            if (!pendingAddRoomId)
              return;
            addNode(categoryId, { nodeId: `room:${pendingAddRoomId}`, type: "room", targetId: pendingAddRoomId });
            setPendingAddRoomId(null);
          }}
          disabled={!pendingAddRoomId}
        >
          添加
        </Button>
      </div>

      {isSpaceOwner && (
        <div className="flex items-center gap-2 mt-2">
          <SelectInput
            density="compact"
            className="flex-1"
            aria-label="添加文档"
            value={pendingAddDocId}
            onChange={(e) => {
              setPendingAddDocId(e.target.value);
            }}
          >
            <option value="">添加文档…</option>
            {visibleDocMetas
              .filter(m => typeof m?.id === "string" && m.id.length > 0)
              .filter(m => !existingDocIdsInTree.has(m.id))
              .map(m => (
                <option key={m.id} value={m.id}>
                  {m.title ?? m.id}
                </option>
              ))}
          </SelectInput>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              if (!pendingAddDocId)
                return;
              addNode(categoryId, { nodeId: `doc:${pendingAddDocId}`, type: "doc", targetId: pendingAddDocId });
              setPendingAddDocId("");
            }}
            disabled={!pendingAddDocId}
          >
            添加
          </Button>
        </div>
      )}

      <div className="flex justify-end mt-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            setAddPanelCategoryId(null);
            setPendingAddRoomId(null);
            setPendingAddDocId("");
          }}
        >
          关闭
        </Button>
      </div>
    </div>
  );
}
