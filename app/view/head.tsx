/* eslint-disable react-dom/no-missing-button-type */
import GainUserAvatar from "./gainUserAvatar";

interface HeadProps {
  onAvatarChange?: (avatarUrl: string) => void;
  currentAvatar?: string;
}

export default function Head({ onAvatarChange, currentAvatar }: HeadProps) {
  const handleUpload = () => {
    // 这里需要实现实际的上传逻辑
    const mockAvatarUrl = "https://placehold.co/150x150?text=新头像";
    onAvatarChange?.(mockAvatarUrl);
  };

  return (
    <div className="h-155 p-2">
      角色头像
      <div className="w-full text-center">
        <div className="m-auto w-30 h-30 bg-red-500">123</div>
        <input type="text" className="m-auto w-80 h-7 bg-[#161823] p-2 mt-3" />
        <button className="btn ml-2 bg-gray-400 inline-block h-7 rounded-none">更新标题</button>
      </div>
      <div className="w-full relative mt-5">
        {/* 选择和上传图像 */}
        <div className="border-t-2q float-left p-2">
          <div>选择一个头像 :</div>
          <button className="btn m-auto block" onClick={handleUpload}>
            <b className="text-gray-400 ml-0">+</b>
            上传新头像
          </button>
          <GainUserAvatar
            initialAvatar={currentAvatar}
            onAvatarChange={onAvatarChange || (() => {})}
          />
        </div>
      </div>
    </div>
  );
}
