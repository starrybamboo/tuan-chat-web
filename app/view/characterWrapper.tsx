// characterWrapper.tsx
import { useState } from "react";
import CharacterNav from "./characterNav";
import CreatCharacter from "./creatCharacter";
import PreviewCharacter from "./previewCharacter";

export interface CharacterData {
  id: number;
  name: string;
  description: string;
  avatar: string;
}

export default function CharacterWrapper() {
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null);

  const handleCreate = (newCharacter: CharacterData) => {
    setCharacters([...characters, newCharacter]);
    setCreating(false);
    setSelectedCharacter(newCharacter.id);
  };

  const handleUpdate = (updatedCharacter: CharacterData) => {
    setCharacters(characters.map(c =>
      c.id === updatedCharacter.id ? updatedCharacter : c,
    ));
    setEditingCharacterId(null);
    setSelectedCharacter(updatedCharacter.id);
  };

  const handleDelete = async (id: number) => {
    // 使用自定义确认对话框，这里使用默认的，需要删除   ↓
    const confirmDelete = window.confirm("确定要删除这个角色吗？"); // eslint-disable-line no-alert
    if (confirmDelete) {
      setCharacters(characters.filter(c => c.id !== id));
      setSelectedCharacter(null);
    }
  };

  return (
    <div className="h-screen w-screen">
      <div className="h-1/15 w-screen bg-gray-600 border-b-1 border-black" />
      <div className="flex h-14/15 bg-gray-500 text-white">
        <CharacterNav
          characters={characters}
          onCreate={() => setCreating(true)}
          onSelect={setSelectedCharacter}
          selected={selectedCharacter}
        />

        <div className="flex-1">
          {creating || editingCharacterId
            ? (
                <CreatCharacter
                  initialData={editingCharacterId ? characters.find(c => c.id === editingCharacterId) : undefined}
                  onSave={editingCharacterId ? handleUpdate : handleCreate}
                  onCancel={() => {
                    setCreating(false);
                    setEditingCharacterId(null);
                  }}
                />
              )
            : selectedCharacter
              ? (
                  <PreviewCharacter
                    character={characters.find(c => c.id === selectedCharacter)!}
                    onEdit={() => setEditingCharacterId(selectedCharacter)}
                    onDelete={handleDelete}
                  />
                )
              : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    点击左侧创建角色或查看已创建的角色
                  </div>
                )}
        </div>
      </div>
    </div>
  );
}
