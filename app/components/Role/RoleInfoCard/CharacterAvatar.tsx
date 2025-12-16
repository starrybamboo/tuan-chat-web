import type { RoleAvatar } from "api";
import type { Role } from "../types";

import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { SpriteSettingsPopup } from "../sprite/SpriteSettingsPopup";

interface CharacterAvatarProps {
  role: Role;
  roleAvatars: RoleAvatar[];
  selectedAvatarId: number;
  selectedAvatarUrl: string;
  selectedSpriteUrl: string | null;
  isLoading?: boolean;
  onchange: (avatarUrl: string, avatarId: number) => void;
  onAvatarSelect: (avatarId: number) => void;
  onAvatarDelete: (avatarId: number) => void;
  onAvatarUpload: (data: any) => void;
}

export default function CharacterAvatar({
  role,
  roleAvatars,
  selectedAvatarId,
  selectedAvatarUrl,
  onchange,
  onAvatarSelect,
}: CharacterAvatarProps) {
  // 弹窗的打开和关闭
  const [changeAvatarConfirmOpen, setChangeAvatarConfirmOpen] = useSearchParamsState<boolean>(`changeAvatarPop`, false);

  // Find selected index from selectedAvatarId
  const selectedIndex = roleAvatars.findIndex(a => a.avatarId === selectedAvatarId);
  const validSelectedIndex = selectedIndex >= 0 ? selectedIndex : 0;

  // Handle sprite index change (when user selects different avatar in the popup)
  const handleSpriteIndexChange = (index: number) => {
    const avatar = roleAvatars[index];
    if (avatar?.avatarId) {
      onAvatarSelect(avatar.avatarId);
    }
  };

  return (
    <div className="w-2xs flex justify-center">
      <div className="avatar cursor-pointer group flex items-center justify-center w-[50%] md:w-48" onClick={() => { setChangeAvatarConfirmOpen(true); }}>
        <div className="rounded-xl ring-primary ring-offset-base-100 w-full ring ring-offset-2 relative">
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-1" />
          <img
            src={selectedAvatarUrl || "./favicon.ico"}
            alt="Character Avatar"
            className="object-cover transform group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      {/* Use SpriteSettingsPopup for avatar management */}
      <SpriteSettingsPopup
        isOpen={changeAvatarConfirmOpen}
        onClose={() => setChangeAvatarConfirmOpen(false)}
        defaultTab="preview"
        spritesAvatars={roleAvatars}
        roleAvatars={roleAvatars}
        currentSpriteIndex={validSelectedIndex}
        characterName={role.name}
        onAvatarChange={onchange}
        onSpriteIndexChange={handleSpriteIndexChange}
        role={role}
      />
    </div>
  );
}
