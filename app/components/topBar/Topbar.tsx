import UserAvatarComponent from "@/view/common/userAvatar";

export default function Topbar() {
  return (
    <div className="w-full h-16 flex items-center justify-between px-4 border-b">
      {/* 左侧 */}
      <div className="flex items-center space-x-6">

        <img
          src="/logo.png"
          alt="Logo"
          className="h-8 w-8 mr-4"
        />

        <a href="/recommend" className="hover:text-primary transition-colors">
          推荐
        </a>
        <a href="/community" className="hover:text-primary transition-colors">
          社区
        </a>
        <a href="/gameplay" className="hover:text-primary transition-colors">
          游玩
        </a>
        <a href="/characters" className="hover:text-primary transition-colors">
          角色
        </a>
        <a href="/mods" className="hover:text-primary transition-colors">
          模组
        </a>
        <a href="/creation" className="hover:text-primary transition-colors">
          创作
        </a>
      </div>

      {/* 右侧用户头像 */}
      <div className="flex items-center">
        <UserAvatarComponent
          userId={1}
          width={8}
          isRounded={true}
          withName={true}
        />
      </div>
    </div>
  );
}
