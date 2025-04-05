/* eslint-disable react-dom/no-missing-button-type */
import GainUserAvatar from "./gainUserAvatar";

interface HeadProps {
  onAvatarChange?: (avatarUrl: string) => void;
  currentAvatar?: string;
  userQuery?: any;
  roleQuery?: any;
}

export default function Head({ onAvatarChange, currentAvatar, userQuery, roleQuery }: HeadProps) {
  const handleUpload = () => {
    // 这里需要实现实际的上传逻辑。另外这玩意会和默认头像的显示冲突，所以我注释掉了
    // const mockAvatarUrl = "https://placehold.co/150x150?text=新头像";
    // onAvatarChange?.(mockAvatarUrl);
  };

  return (
    <div className="h-155 p-2 w-full">
      <div className="text-center">
        <div className="m-auto w-32 h-32 bg-primary rounded-full flex items-center justify-center text-white text-2xl">
          123
        </div>
        <input
          type="text"
          className="m-auto w-80 h-9 bg-base-200 p-2 mt-3 input input-bordered"
          placeholder="输入标题"
        />
        <button className="ml-2 btn btn-dash inline-block h-9 rounded-none mt-3">
          更新标题
        </button>
      </div>
      <div className="w-full relative mt-5">
        {/* 选择和上传图像 */}
        <div className="border-t-2 border-white float-left p-2 w-full">
          <div className="mb-2">选择一个头像 :</div>
          <button className="btn btn-dash m-auto block" onClick={handleUpload}>
            <b className="text-white ml-0">+</b>
            上传新头像
          </button>
          <GainUserAvatar
            initialAvatar={currentAvatar}
            onAvatarChange={onAvatarChange || (() => {})}
            userQuery={userQuery}
            roleQuery={roleQuery}
          />
        </div>
      </div>
    </div>
  );
}
