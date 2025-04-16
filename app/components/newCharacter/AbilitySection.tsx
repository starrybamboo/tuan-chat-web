import type { Role } from "@/components/newCharacter/types";
import { useEffect, useState } from "react";
import Section from "./Section";

interface AbilityLabel {
  id: number;
  name: string;
  value: number;
}

interface Props {
  abilities: AbilityLabel[];
  isEditing: boolean;
  role: Role; // 新增角色名称属性
  onChange: (items: AbilityLabel[]) => void;
}

// 根据名称生成的年龄计算敏捷
function calculateAgility(name: string): number {
  const age = Number(name);
  if (age >= 10 && age < 20)
    return 20;
  if (age >= 20 && age < 30)
    return 30;
  if (age >= 30 && age < 40)
    return 15;
  if (age >= 50 && age <= 60)
    return 10;
  return age !== 0 ? 5 : 0;
}

export default function InventorySection({
  abilities,
  isEditing,
  role,
  onChange,
}: Props) {
  const [newItemName, setNewItemName] = useState("");
  const [newItemValue, setNewItemValue] = useState("");

  // 名称变化时更新敏捷
  useEffect(() => {
    const agilityValue = calculateAgility(role.name);
    const existing = abilities.find(a => a.name === "敏捷");

    if (existing) {
      if (existing.value !== agilityValue) {
        onChange(abilities.map(a =>
          a.name === "敏捷" ? { ...a, value: agilityValue } : a,
        ));
      }
    }
    else {
      onChange([...abilities, {
        id: Date.now(),
        name: "敏捷",
        value: agilityValue,
      }]);
    }
  }, [role.name]); // 监听名称变化
  const handleAddItem = () => {
    onChange([...abilities, {
      id: Date.now(),
      name: newItemName,
      value: Number(newItemValue) || 0,
    }]);
    setNewItemName("");
    setNewItemValue("");
  };

  if (isEditing) {
    return (
      <Section title="角色属性">

        {/* 添加新属性 */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="属性名称"
              className="input input-bordered flex-1"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
            />
            <input
              type="number"
              placeholder="数值"
              className="input input-bordered w-24"
              value={newItemValue}
              onChange={e => setNewItemValue(e.target.value)}
            />
          </div>
          <button
            onClick={handleAddItem}
            className="btn btn-primary sm:w-32"
          >
            添加属性
          </button>
        </div>

        {/* 属性列表 */}
        <div className="space-y-3">
          {abilities.map((item, index) => (
            <div key={item.id} className="flex gap-2 items-center bg-base-200 p-2 rounded-lg">
              <input
                type="text"
                value={item.name}
                onChange={(e) => {
                  const newItems = [...abilities];
                  newItems[index].name = e.target.value;
                  onChange(newItems);
                }}
                className={`input input-bordered flex-1 input-sm ${
                  item.name === "敏捷" ? "bg-base-300" : ""
                }`}
                readOnly={item.name === "敏捷"}
              />
              <input
                type="number"
                value={item.value}
                onChange={(e) => {
                  const newItems = [...abilities];
                  newItems[index].value = Number(e.target.value);
                  onChange(newItems);
                }}
                className="input input-bordered w-20 input-sm text-center"
                readOnly={item.name === "敏捷"}
              />
              {item.name !== "敏捷" && (
                <button
                  className="btn btn-circle btn-sm btn-error"
                  onClick={() => onChange(abilities.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>
    );
  }
  else {
    return (
      <Section title="角色属性">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {abilities.map(ability => (
            <div
              key={ability.id}
              className="flex justify-between items-center bg-base-200 p-3 rounded-lg"
            >
              <span className="font-medium">{ability.name}</span>
              <span className="badge badge-lg" data-value={ability.value}>
                {ability.value}
                {ability.name === "敏捷" && (
                  <span className="text-xs ml-1 opacity-75">(AUTO)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </Section>
    );
  }
}
