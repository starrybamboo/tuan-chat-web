import { RoomContext } from "@/components/chat/roomContext";
import { EditableField } from "@/components/common/editableField";
import { use, useState } from "react";
import {
  useGetRoomInitiativeListQuery,
  useRoomInitiativeListMutation,
} from "../../../../api/hooks/chatQueryHooks";

export interface Initiative {
  name: string;
  value: number;
}

/**
 * 先攻列表
 */
export default function InitiativeList() {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  const initiativeListMutation = useRoomInitiativeListMutation(roomId);
  const getRoomInitiativeListQuery = useGetRoomInitiativeListQuery(roomId);
  const list = getRoomInitiativeListQuery.data ?? [];
  const [newItem, setNewItem] = useState({ name: "", value: "" });

  // 删除项
  const handleDelete = (index: number) => {
    initiativeListMutation.mutate(JSON.stringify(list.filter((_, i) => i !== index)));
  };

  // 保存编辑
  const handleUpdate = (initiativeList: Initiative[]) => {
    initiativeListMutation.mutate(JSON.stringify(initiativeList.sort((a, b) => b.value - a.value)));
  };

  // 添加新项
  const handleAdd = () => {
    handleUpdate([
      ...list.filter(i => i.name !== newItem.name),
      { name: newItem.name, value: Number(newItem.value) },
    ]);
  };

  return (
    <div className="flex flex-col gap-4 bg-base-100">
      {/* 先攻指令列表 */}
      <div className="space-y-2 w-full p-2">
        {/* 添加新项的表单 */}
        <div className="flex gap-2 w-full justify-center">
          <input
            type="text"
            placeholder="角色名"
            value={newItem.name}
            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
            className="input input-bordered w-24"
          />
          <input
            type="number"
            placeholder="先攻"
            value={newItem.value}
            onChange={e => setNewItem({ ...newItem, value: e.target.value })}
            className="input input-bordered w-24"
          />
          <button
            onClick={handleAdd}
            className="btn btn-info"
            disabled={!newItem.name || Number.isNaN(Number(newItem.value))}
          >
            添加
          </button>
        </div>

        {/* 列表项 */}
        <div className="space-y-2 w-full ">
          {list.map((item, index) => (
            <div
              key={item.name}
              className="flex gap-3 p-3 rounded-lg items-center justify-between hover:bg-base-200 transition-colors group"
            >
              <EditableField
                content={item.name}
                handleContentUpdate={(newName) => {
                  handleUpdate(list.map(i => i.name === item.name ? { ...i, name: newName } : i));
                }}
                className="font-medium truncate max-w-30"
                usingInput
              >
              </EditableField>

              <div className="flex items-center gap-2">
                <EditableField
                  content={item.value.toString()}
                  handleContentUpdate={(newValue) => {
                    handleUpdate(list.map(i => i.name === item.name ? { ...i, value: Number(newValue) } : i));
                  }}
                  className="max-w-20 text-right"
                  usingInput
                  type="number"
                >
                </EditableField>

                <button
                  onClick={() => handleDelete(index)}
                  className="btn btn-circle btn-ghost btn-sm text-error opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="h-px bg-base-300 md:hidden"></div>
    </div>
  );
}
