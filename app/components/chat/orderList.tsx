import { useState } from "react";

export const mockOrders = [
  { name: "优先级 A", value: 100 },
  { name: "优先级 B", value: 75 },
  { name: "优先级 C", value: 50 },
  { name: "优先级 D", value: 25 },
];

export default function OrderList({ orders = mockOrders }: { orders?: { name: string; value: number }[] }) {
  const [list, setList] = useState([...orders].sort((a, b) => b.value - a.value));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newItem, setNewItem] = useState({ name: "", value: "" });

  // 删除项
  const handleDelete = (index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  // 开始编辑数值
  const handleEditStart = (index: number, value: number) => {
    setEditingIndex(index);
    setEditValue(value.toString());
  };

  // 保存编辑
  const handleEditSave = (index: number) => {
    const newValue = Number.parseInt(editValue);
    if (!Number.isNaN(newValue)) {
      const newList = [...list];
      newList[index].value = newValue;
      setList(newList.sort((a, b) => b.value - a.value));
    }
    setEditingIndex(null);
  };

  // 添加新项
  const handleAdd = () => {
    if (newItem.name && !Number.isNaN(Number(newItem.value))) {
      setList([
        ...list,
        { name: newItem.name, value: Number(newItem.value) },
      ].sort((a, b) => b.value - a.value));
      setNewItem({ name: "", value: "" });
    }
  };

  return (
    <div className="space-y-3 w-full p-4 ">
      {/* 列表展示 - 宽度自适应 */}
      <span className="text-center">先攻指令</span>
      <div className="flex gap-2 w-full">
        <input
          type="text"
          placeholder="角色名"
          value={newItem.name}
          onChange={e => setNewItem({ ...newItem, name: e.target.value })}
          className="w-24 flex border rounded px-3 py-2"
        />
        <input
          type="number"
          placeholder="数值或表达式"
          value={newItem.value}
          onChange={e => setNewItem({ ...newItem, value: e.target.value })}
          className="w-24 border rounded px-3 py-2 "
        />
        <button
          onClick={handleAdd}
          className="px-4 btn btn-info"
          disabled={!newItem.name || Number.isNaN(Number(newItem.value))}
        >
          添加
        </button>
      </div>

      <ul className="divide-y divide-gray-200 border rounded-lg overflow-hidden w-full">
        {list.map((item, index) => (
          <li
            key={index}
            className="p-3 hover:bg-gray-50 flex justify-between items-center group w-full"
          >
            <span className="font-medium truncate max-w-[60%]">{item.name}</span>

            <div className="flex items-center">
              {editingIndex === index
                ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => handleEditSave(index)}
                      onKeyDown={e => e.key === "Enter" && handleEditSave(index)}
                      className="w-20 border rounded px-2 py-1 text-right"
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
                className="ml-2 w-6 h-6 flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 rounded-full"
                title="删除"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>

  );
}
