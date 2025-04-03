/* eslint-disable react-dom/no-missing-button-type */
// characterNav.tsx
import type { CharacterData } from "./characterWrapper";

interface Props {
  characters: CharacterData[];
  onCreate: () => void;
  onSelect: (id: number) => void;
  selected: number | null;
}

export default function CharacterNav({ characters, onCreate, onSelect, selected }: Props) {
  return (
    <div className="w-64 p-4 bg-gray-600 border-r-1 border-black">
      {/* 新建角色 */}
      <button
        onClick={onCreate}
        className="btn btn-primary btn-block bg-gray-500 border-1 border-dashed border-amber-100 h-15 rounded-none text-white mb-4"
      >
        <div className="bg-gray-700 w-9 h-9 rounded-full text-center pt-1.5">+</div>
        创建新角色
      </button>

      <div className="overflow-y-auto h-[calc(100%-100px)]">
        {characters.map(character => (
          // 渲染
          <div
            key={character.id}
            onClick={() => onSelect(character.id)}
            className={`p-2 mb-2 cursor-pointer ${
              selected === character.id ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
          >
            {/* 左侧人物预览组件 */}
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full mr-2 overflow-hidden">
                <img
                // 你需要在这里调用正确的头像
                  src={character.avatar}
                  alt={character.name}
                  className="h-full w-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{character.name}</p>
                <p className="text-sm text-gray-300 truncate">{character.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
