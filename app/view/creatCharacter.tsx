/* eslint-disable react-dom/no-missing-button-type */
import type { CharacterData } from "./characterWrapper";
// creatCharacter.tsx
import { useState } from "react";
import Head from "./head";
import DefaultAvatar from "./test_avatar/defaultAvatar.png";

interface Props {
  onSave: (character: CharacterData) => void;
  onCancel: () => void;
  initialData?: CharacterData;
}

export default function CreatCharacter({ onSave, onCancel, initialData }: Props) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [avatar, setAvatar] = useState(initialData?.avatar || "");

  const handleSubmit = () => {
    const newCharacter = {
      id: initialData?.id || Date.now(), // 保留原有ID
      name,
      description,
      avatar: avatar || DefaultAvatar,
    };
    onSave(newCharacter);
  };

  return (
    <div className="h-full overflow-y-scroll">
      <div className="h-10 border-b-1 border-black p-2 flex justify-between items-center">
        {initialData ? "编辑角色" : "创建角色"}
        <div>
          <button onClick={onCancel} className="btn btn-sm mr-2">
            取消
          </button>
          <button onClick={handleSubmit} className="btn btn-sm btn-primary">
            保存
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <label className="block mb-2">角色名称</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-9 bg-[#161823] p-2 rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2">角色描述</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="bg-[#161823] w-full rounded p-2 h-24 resize-none"
          />
        </div>

        <Head
          onAvatarChange={setAvatar}
          currentAvatar={initialData?.avatar} // 传递当前头像
        />
      </div>
    </div>
  );
}
