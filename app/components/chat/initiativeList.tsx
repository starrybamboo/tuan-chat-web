import { RoomContext } from "@/components/chat/roomContext";
import { use, useState } from "react";
import {
  useGetRoomInitiativeListQuery,
  useRoomInitiativeListMutation,
} from "../../../api/hooks/chatQueryHooks";

export interface Initiative {
  name: string;
  value: number;
}

export default function InitiativeList() {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  const initiativeListMutation = useRoomInitiativeListMutation(roomId);
  const getRoomInitiativeListQuery = useGetRoomInitiativeListQuery(roomId);
  const list = getRoomInitiativeListQuery.data ?? [];
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newItem, setNewItem] = useState({ name: "", value: "" });

  // 删除项
  const handleDelete = (index: number) => {
    initiativeListMutation.mutate(JSON.stringify(list.filter((_, i) => i !== index)));
  };

  // 开始编辑数值
  const handleEditStart = async (index: number, value: number) => {
    await getRoomInitiativeListQuery.refetch();
    setEditingIndex(index);
    setEditValue(value.toString());
  };

  // 保存编辑
  const handleEditSave = async (index: number) => {
    await getRoomInitiativeListQuery.refetch();
    const newValue = Number.parseInt(editValue);
    if (!Number.isNaN(newValue)) {
      const newList = [...list];
      newList[index].value = newValue;
      initiativeListMutation.mutate(JSON.stringify(newList.sort((a, b) => b.value - a.value)));
    }
    setEditingIndex(null);
  };

  // 添加新项
  const handleAdd = async () => {
    await getRoomInitiativeListQuery.refetch();
    if (newItem.name && !Number.isNaN(Number(newItem.value))) {
      initiativeListMutation.mutate(JSON.stringify([
        ...list.filter(i => i.name !== newItem.name),
        { name: newItem.name, value: Number(newItem.value) },
      ].sort((a, b) => b.value - a.value)));
      setNewItem({ name: "", value: "" });
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 先攻指令列表 */}
      <div className="space-y-2 w-full">
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
              key={index}
              className="flex gap-3 p-3 rounded-lg items-center justify-between hover:bg-base-200 transition-colors group"
            >
              <span className="font-medium truncate">{item.name}</span>

              <div className="flex items-center gap-2">
                {editingIndex === index
                  ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => handleEditSave(index)}
                        onKeyDown={e => e.key === "Enter" && handleEditSave(index)}
                        className="input input-bordered w-20 text-right"
                        autoFocus
                      />
                    )
                  : (
                      <span
                        onDoubleClick={() => handleEditStart(index, item.value)}
                        className="cursor-text select-none px-2 min-w-[40px] text-right"
                      >
                        {item.value}
                      </span>
                    )}

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
    </div>
  );
}
