// InventorySection.tsx（背包模块）
import type { InventoryItem } from "./types";
import { useState } from "react";
import Section from "./Section";

export default function InventorySection({
  items,
  isEditing,
  onChange,
}: {
  items: InventoryItem[];
  isEditing: boolean;
  onChange: (items: InventoryItem[]) => void;
}) {
  const [newItemName, setNewItemName] = useState("");

  const handleAddItem = () => {
    if (newItemName.trim()) {
      onChange([
        ...items,
        {
          id: Date.now(),
          name: newItemName,
          quantity: 1,
        },
      ]);
      setNewItemName("");
    }
  };

  return (
    <Section title="角色背包">
      {isEditing
        ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="新物品名称"
                  className="input input-bordered flex-1"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                />
                <button onClick={handleAddItem} className="btn btn-primary">
                  添加
                </button>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].name = e.target.value;
                        onChange(newItems);
                      }}
                      className="input input-bordered flex-1 input-sm"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].quantity = Number.parseInt(e.target.value) || 0;
                        onChange(newItems);
                      }}
                      className="input input-bordered w-20 input-sm"
                    />
                    <button
                      className="btn btn-square btn-sm btn-ghost"
                      onClick={() => onChange(items.filter((_, i) => i !== index))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        : (
            <div className="space-y-2">
              {items.length > 0
                ? (
                    items.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.name}</span>
                        <span className="text-base-content/70">
                          x
                          {item.quantity}
                        </span>
                      </div>
                    ))
                  )
                : (
                    <div className="text-base-content/70">背包空空如也</div>
                  )}
            </div>
          )}
    </Section>
  );
}
