/* eslint-disable react-dom/no-missing-button-type */
// previewCharacter.tsx
import type { CharacterData } from "./characterWrapper";

interface Props {
  character: CharacterData;
  onEdit: () => void;
  onDelete: (id: number) => void;
}

export default function PreviewCharacter({ character, onEdit, onDelete }: Props) {
  return (
    <div className="h-full overflow-y-scroll">
      <div className="h-10 border-b-1 border-black p-2 flex justify-between items-center">
        <span>角色详情</span>
        <div>
          <button onClick={onEdit} className="btn btn-sm mr-2">
            编辑
          </button>
          <button onClick={() => onDelete(character.id)} className="btn btn-sm btn-error">
            删除
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-bold">{character.name}</h3>
          <p className="text-gray-300">{character.description}</p>
        </div>
        <div className="w-32 h-32 bg-gray-700 rounded-lg overflow-hidden">
          <img src={character.avatar} alt={character.name} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
