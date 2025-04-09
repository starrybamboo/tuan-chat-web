/* eslint-disable react-dom/no-missing-button-type */
import type { CharacterData } from "app/routes/characterWrapper";

interface Props {
  character: CharacterData;
  onEdit: () => void;
  onDelete: (id: number) => void;
}

export default function PreviewCharacter({ character, onEdit, onDelete }: Props) {
  return (
    <div className="h-full overflow-y-scroll">
      <div className="h-10 border-b-1 border-base-200 p-2 flex justify-between items-center">
        <span className="font-semibold">角色详情</span>
        <div>
          <button onClick={onEdit} className="btn btn-sm bg-[#3A7CA5] hover:bg-[#2A6F97] text-white mr-2">
            编辑
          </button>
          <button onClick={() => onDelete(character.id)} className="btn btn-sm btn-error">
            删除
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* 基本信息卡片 */}
        <div className="card bg-base-100 shadow-md mb-4">
          <div className="card-body">
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 bg-base-300 rounded-lg overflow-hidden">
                <img src={character.avatar} alt={character.name} className="object-cover w-full h-full" />
              </div>
              <div>
                <h2 className="card-title text-2xl">{character.name}</h2>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {/* 某些情况在冒号后面直接敲空格可能被省略，建议还是手动添加“ ” */}
                  <div>
                    <span className="text-gray-500">年龄:</span>
                    {character.age}
                  </div>
                  <div>
                    <span className="text-gray-500">性别:</span>
                    {" "}
                    {character.gender}
                  </div>
                  <div>
                    <span className="text-gray-500">职业:</span>
                    {" "}
                    {character.profession}
                  </div>
                  <div>
                    <span className="text-gray-500">故乡:</span>
                    {" "}
                    {character.hometown}
                  </div>
                  <div>
                    <span className="text-gray-500">住址:</span>
                    {" "}
                    {character.address}
                  </div>
                  <div>
                    <span className="text-gray-500">当前时间:</span>
                    {" "}
                    {character.currentTime}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 可视化属性条 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-base-100 p-4 rounded-lg shadow">
            <h3 className="font-bold mb-2">生命值</h3>
            <div className="flex items-center gap-2">
              {/* 状态条 */}
              <progress
                className="progress progress-error w-full"
                value={character.health.current}
                max={character.health.max}
              >
              </progress>
              {/* 显示实际数组 */}
              <span>
                {character.health.current}
                /
                {character.health.max}
              </span>
            </div>
          </div>

          <div className="bg-base-100 p-4 rounded-lg shadow">
            <h3 className="font-bold mb-2">魔法值</h3>
            <div className="flex items-center gap-2">
              <progress
                className="progress progress-info w-full"
                value={character.magic.current}
                max={character.magic.max}
              >
              </progress>
              <span>
                {character.magic.current}
                /
                {character.magic.max}
              </span>
            </div>
          </div>

          <div className="bg-base-100 p-4 rounded-lg shadow">
            <h3 className="font-bold mb-2">理智 (Sanity)</h3>
            <div className="flex items-center gap-2">
              <progress
                className="progress progress-warning w-full"
                value={character.sanity.current}
                max={character.sanity.max}
              >
              </progress>
              <span>
                {character.sanity.current}
                /
                {character.sanity.max}
              </span>
            </div>
          </div>

          <div className="bg-base-100 p-4 rounded-lg shadow">
            <h3 className="font-bold mb-2">幸运</h3>
            <div className="flex items-center gap-2">
              <progress
                className="progress progress-success w-full"
                value={character.luck}
                max="100"
              >
              </progress>
              <span>
                {character.luck}
                /100
              </span>
            </div>
          </div>
        </div>

        {/* 角色描述 */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title">角色描述</h3>
            <pre className="whitespace-pre-wrap font-sans">{character.description}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
