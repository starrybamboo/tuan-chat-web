/* eslint-disable react-dom/no-missing-button-type */
import type { CharacterData } from "./characterWrapper";
import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useUpdateRoleAvatar } from "api/queryHooks";
import { useState } from "react";
import Head from "./head";

interface Props {
  onSave: (character: CharacterData) => void;
  onCancel: () => void;
  initialData?: CharacterData;
  userQuery?: any;
  roleQuery?: any;
}

export default function CreatCharacter({ onSave, onCancel, initialData, userQuery, roleQuery }: Props) {
  const [name, setName] = useState(initialData?.name || "");
  const [age, setAge] = useState(initialData?.age || 20);
  const [gender, setGender] = useState(initialData?.gender || "未知");
  const [profession, setProfession] = useState(initialData?.profession || "");
  const [hometown, setHometown] = useState(initialData?.hometown || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [currentTime, setCurrentTime] = useState(initialData?.currentTime || new Date().toLocaleDateString());
  // 这里在角色数值变为0后会触发initialData?.example，角色重新初始化，这个需要调整
  const [health, setHealth] = useState(initialData?.health || { max: 99, current: 50 });
  const [magic, setMagic] = useState(initialData?.magic || { max: 99, current: 50 });
  const [sanity, setSanity] = useState(initialData?.sanity || { max: 99, current: 50 });
  const [luck, setLuck] = useState(initialData?.luck || 50);
  const [description, setDescription] = useState(initialData?.description || "");
  const [avatar, setAvatar] = useState(initialData?.avatar || "");
  const [avatarId, setAvatarId] = useState(0);

  // 发送post数据部分
  const { mutate } = useMutation({
    mutationKey: ["creatOrUpdateRole"],
    mutationFn: async (data: any) => {
      if (initialData === undefined) {
        const res = await tuanchat.roleController.createRole({});
        console.warn(`创建角色信息`);
        if (res.success) {
          const roleId = res.data;
          if (roleId) {
            const updateRes = await tuanchat.roleController.updateRole({
              roleId,
              roleName: data.name,
              description: data.description,
            },
            );
            console.warn(`成功${roleId}`);
            return updateRes;
          }
          else {
            console.error(`更新角色信息失败`);
            return undefined;
          }
        }
        else {
          console.error("创建角色失败");
        }
      }
      else {
        const updateRes = await tuanchat.roleController.updateRole({
          roleId: initialData?.id as number,
          roleName: data.name,
          description: data.description,
        },
        );
        return updateRes;
      }
    },
    onSuccess: (data) => {
      if (data?.success) {
        const newCharacter = {
          id: initialData?.id || Date.now(),
          name: name.trim() || "未命名角色",
          age,
          gender,
          profession,
          hometown,
          address,
          currentTime,
          health,
          magic,
          sanity,
          luck,
          description: description || "无描述",
          avatar: avatar || "",
          currentIndex: 0,
        };
        onSave(newCharacter);
      }
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      if (error.response && error.response.data) {
        console.error("Server response:", error.response.data);
      }
    },
  });

  // 头像改变
  const { mutate: mutateAvatar } = useUpdateRoleAvatar(avatarId);

  const handleSubmit = () => {
    const cleanDescription = description
      .replace(/\r\n/g, "\n")
      .replace(/ {2,}/g, " ")
      .replace(/\n{2,}/g, "\n")
      .replace(/\s+$/g, "");

    const newCharacter = {
      id: initialData?.id || Date.now(),
      name: name.trim() || "未命名角色",
      age,
      gender,
      profession,
      hometown,
      address,
      currentTime,
      health,
      magic,
      sanity,
      luck,
      description: cleanDescription || "无描述",
      avatar: avatar || "",
      currentIndex: avatarId,
    };

    onSave(newCharacter);
    const dataToSend = newCharacter;
    mutate(dataToSend);

    // 如果头像有变化，触发头像更新逻辑
    mutateAvatar({ id: initialData?.id || Date.now(), avatar });
  };

  return (
    <div className="h-full overflow-y-scroll w-full bg-base-100">
      <div className="h-10 border-b-1 border-white p-2 flex justify-between items-center">
        {initialData ? "编辑角色" : "创建角色"}
        <div>
          <button onClick={onCancel} className="btn btn-sm btn-outline btn-error mr-2">
            取消
          </button>
          <button onClick={handleSubmit} className="btn btn-sm bg-[#3A7CA5] text-white hover:bg-[#2A6F97]">
            保存
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* 基本信息1 */}
        {/* 在中等屏幕尺寸显示 4 列 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block mb-2">角色姓名</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-9 bg-base-200 p-2 rounded input input-bordered"
            />
          </div>

          <div>
            <label className="block mb-2">年龄</label>
            <input
              type="number"
              value={age}
              onChange={e => setAge(Number.parseInt(e.target.value) || 0)}
              className="w-full h-9 bg-base-200 p-2 rounded input input-bordered"
            />
          </div>

          <div>
            <label className="block mb-2">性别</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full h-9 bg-base-200 p-2 rounded select select-bordered"
            >
              <option value="男">男</option>
              <option value="女">女</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div>
            <label className="block mb-2">
              职业
              {" "}
              <a
                // 给用户一个职业列表，然后让他选择，最后这里会作为一个参数返回，来进一步限定力量什么的
                href="/professions"
                className="tooltip tooltip-right inline-block"
                data-tip="有哪些可选职业？"
              >
                <span className="w-4 h-4 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs">?</span>
              </a>
            </label>
            <input
              value={profession}
              onChange={e => setProfession(e.target.value)}
              className="w-full h-9 bg-base-200 p-2 rounded input input-bordered"
            />
          </div>
        </div>
        {/* 基本信息2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block mb-2">故乡</label>
            <input
              value={hometown}
              onChange={e => setHometown(e.target.value)}
              className="w-full h-9 bg-base-200 p-2 rounded input input-bordered"
            />
          </div>

          <div>
            <label className="block mb-2">住址</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full h-9 bg-base-200 p-2 rounded input input-bordered"
            />
          </div>

          <div>
            <label className="block mb-2">当前时间</label>
            <input
              type="date"
              value={currentTime}
              onChange={e => setCurrentTime(e.target.value)}
              className="w-full h-9 bg-base-200 p-2 rounded input input-bordered"
            />
          </div>
        </div>

        {/* 属性设置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-base-200 p-4 rounded-lg">
            <h3 className="font-bold mb-2">
              生命值
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block mb-1">最大值</label>
                {/* type="number"修改会出现“0删不掉的情况”目前懒得改 */}
                <input
                  type="number"
                  value={health.max}
                  onChange={e => setHealth({ ...health, max: Number.parseInt(e.target.value) || 0 })}
                  className="w-full h-9 bg-base-100 p-2 rounded input input-bordered"
                />
              </div>
              <div>
                <label className="block mb-1">当前值</label>
                <input
                  type="number"
                  value={health.current}
                  onChange={e => setHealth({ ...health, current: Number.parseInt(e.target.value) || 0 })}
                  className="w-full h-9 bg-base-100 p-2 rounded input input-bordered"
                />
              </div>
            </div>
          </div>

          <div className="bg-base-200 p-4 rounded-lg">
            <h3 className="font-bold mb-2">魔法值</h3>
            <div className="space-y-2">
              <div>
                <label className="block mb-1">最大值</label>
                <input
                  type="number"
                  value={magic.max}
                  onChange={e => setMagic({ ...magic, max: Number.parseInt(e.target.value) || 0 })}
                  className="w-full h-9 bg-base-100 p-2 rounded input input-bordered"
                />
              </div>
              <div>
                <label className="block mb-1">当前值</label>
                <input
                  type="number"
                  value={magic.current}
                  onChange={e => setMagic({ ...magic, current: Number.parseInt(e.target.value) || 0 })}
                  className="w-full h-9 bg-base-100 p-2 rounded input input-bordered"
                />
              </div>
            </div>
          </div>

          <div className="bg-base-200 p-4 rounded-lg">
            <h3 className="font-bold mb-2">理智 (Sanity)</h3>
            <div className="space-y-2">
              <div>
                <label className="block mb-1">最大值</label>
                <input
                  type="number"
                  value={sanity.max}
                  onChange={e => setSanity({ ...sanity, max: Number.parseInt(e.target.value) || 0 })}
                  className="w-full h-9 bg-base-100 p-2 rounded input input-bordered"
                />
              </div>
              <div>
                <label className="block mb-1">当前值</label>
                <input
                  type="number"
                  value={sanity.current}
                  onChange={e => setSanity({ ...sanity, current: Number.parseInt(e.target.value) || 0 })}
                  className="w-full h-9 bg-base-100 p-2 rounded input input-bordered"
                />
              </div>
            </div>
          </div>

          <div className="bg-base-200 p-4 rounded-lg">
            <h3 className="font-bold mb-2">幸运</h3>
            <div>
              <input
                type="number"
                value={luck}
                onChange={e => setLuck(Number.parseInt(e.target.value) || 0)}
                className="w-full h-9 bg-base-100 p-2 rounded input input-bordered"
              />
            </div>
          </div>
        </div>

        {/* 角色描述 */}
        <div className="mb-4">
          <label className="block mb-2">角色描述</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="bg-base-200 w-full rounded p-2 h-24 resize-none textarea textarea-bordered"
          />
        </div>

        {/* 头像选择 */}
        <Head
          onAvatarChange={setAvatar}
          onAvatarIdChange={setAvatarId}
          roleId={initialData?.id ? initialData?.id : 0}
          currentAvatar={initialData?.avatar}
          userQuery={userQuery}
          roleQuery={roleQuery}
        />
      </div>
    </div>
  );
}
