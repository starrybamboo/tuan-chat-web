/* eslint-disable react-dom/no-missing-button-type */
import type { CharacterData } from "@/components/character/characterWrapper";
import { useState } from "react";

interface Props {
  characters: CharacterData[];
  onCreate: () => void;
  onSelect: (id: number) => void;
  selected: number | null;
}

export default function CharacterNav({ characters, onCreate, onSelect, selected }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  // 过滤角色名
  const filteredCharacters = characters.filter(character =>
    character.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  return (
    <div className="w-full bg-base-100 border-base-300 text-center h-full text-info-content">
      {/* 搜索框 */}
      <input
        type="text"
        placeholder="搜索角色"
        className="input input-sm w-6/7 mb-2 mt-[30px] bg-[#A3C7E6] hover:bg-[#B1D1ED] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />

      {/* 创建新角色 */}
      <button
        onClick={onCreate}
        className="btn w-4/5 bg-primary text-white m-5"
      >
        + 创建新角色
      </button>

      {/* 列表 */}
      <div className="overflow-y-auto h-[calc(100%-160px)]">
        {filteredCharacters.map(character => (
          <div
            key={character.id}
            onClick={() => onSelect(character.id)}
            className={`h-15 p-2 mb-2 ml-2 mr-2 cursor-pointer rounded-[16px] ${
              selected === character.id
                ? "bg-[#D4E6F5] bg-opacity-20"
                : "hover:bg-[#9EC5E4] hover:bg-opacity-10"
            }`}
          >
            {/* 左侧人物预览组件 */}
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full mr-2 overflow-hidden">
                <img
                  src={character.avatar}
                  alt={character.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                {/* 高亮名字 */}
                <p className="truncate font-medium text-[#1E3A8A] ">
                  {highlightMatch(character.name, searchTerm)}
                </p>
                <p className="text-sm truncate text-[#3B82F6]">{character.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 高亮匹配关键字函数
function highlightMatch(text: string, keyword: string) {
  // 处理关键字为空的情况
  if (!keyword)
    return text;
  // gi：全局 不区分大小写
  const regex = new RegExp(`(${keyword})`, "gi");
  const parts = text.split(regex);

  // 遍历渲染
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase()
    // 判断那些需要高亮
      ? (
    // eslint-disable-next-line react/no-array-index-key
          <span key={i} className="bg-yellow-300 text-black font-bold">
            {part}
          </span>
        )
      : (
          part
        ),
  );
}
