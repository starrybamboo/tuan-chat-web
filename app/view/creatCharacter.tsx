/* eslint-disable react-dom/no-missing-button-type */
import type { CharacterData } from "./characterWrapper";
import { useState } from "react";
import Head from "./head";
import DefaultAvatar from "./test_avatar/defaultAvatar.png";

interface Props {
  onSave: (character: CharacterData) => void;
  onCancel: () => void;
  initialData?: CharacterData;
  userQuery?: any;
  roleQuery?: any;
}

export default function CreatCharacter({ onSave, onCancel, initialData, userQuery, roleQuery }: Props) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [avatar, setAvatar] = useState(initialData?.avatar || "");

  const handleSubmit = () => {
    const cleanDescription = description
      .replace(/\r\n/g, "\n") // 标准化换行符（兼容 Windows）
      .replace(/ {2,}/g, " ") // 多个空格 -> 单个空格
      .replace(/\n{2,}/g, "\n") // 清除空行
      .replace(/\s+$/g, ""); // 删除结尾空格和空行
    const newCharacter = {
      id: initialData?.id || Date.now(), // 保留原有ID
      name: name.trim() || "未命名角色",
      description: cleanDescription || "无描述",
      avatar: avatar || DefaultAvatar,
    };
    onSave(newCharacter);
  };

  return (
    <div className="h-full overflow-y-scroll w-full">
      <div className="h-10 border-b-1 border-white p-2 flex justify-between items-center">
        {initialData ? "编辑角色" : "创建角色"}
        <div>
          <button onClick={onCancel} className="btn btn-sm btn-outline btn-error">
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
            className="w-full h-9 bg-base-200 p-2 rounded input input-bordered"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2">角色描述</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="bg-base-200 w-full rounded p-2 h-24 resize-none textarea textarea-bordered"
          />
        </div>

        <Head
          onAvatarChange={setAvatar}
          currentAvatar={initialData?.avatar} // 传递当前头像
          userQuery={userQuery}
          roleQuery={roleQuery}
        />
      </div>
    </div>
  );
}
