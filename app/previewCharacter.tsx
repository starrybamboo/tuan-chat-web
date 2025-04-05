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
      <div className="h-10 border-b-1 border-base-200 p-2 flex justify-between items-center">
        <span className="font-semibold">角色详情</span>
        <div>
          <button onClick={onEdit} className="btn btn-sm btn-primary mr-2">
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
          <pre className="text-gray-400">
            {character.description}
          </pre>
        </div>
        <div className="w-32 h-32 bg-base-300 rounded-lg overflow-hidden">
          <img src={character.avatar} alt={character.name} className="object-cover w-full h-full" />
        </div>
      </div>
    </div>
  );
}
