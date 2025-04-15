export default function CharacterNav() {
  return (
    <div className="drawer lg:drawer-open">
      <input id="character-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-side">
        <label htmlFor="character-drawer" className="drawer-overlay"></label>
        <div className="menu p-4 w-80 min-h-full bg-base-200">
          {/* 搜索和创建区域 */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="搜索角色..."
              className="input input-bordered w-full"
            />
            <button
              type="button"
              className="btn btn-primary"
              title="创建新角色"
            >
              <span className="text-xl">+</span>
            </button>
          </div>

          {/* 角色列表 */}
          <div className="space-y-2 overflow-y-auto">
            {/* 示例角色项 */}
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 cursor-pointer transition-colors">
              <div className="avatar">
                <div className="w-12 rounded-full">
                  <div className="bg-neutral-content w-full h-full flex items-center justify-center">
                    <span className="text-neutral text-xs">头像</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-base truncate">示例角色名称</h3>
                <p className="text-sm text-base-content/70 truncate">这是一个简短的角色的描述...</p>
              </div>
            </div>

            {/* 更多示例项 */}
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 cursor-pointer transition-colors">
              <div className="avatar">
                <div className="w-12 rounded-full">
                  <div className="bg-neutral-content w-full h-full flex items-center justify-center">
                    <span className="text-neutral text-xs">头像</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-base truncate">另一个角色</h3>
                <p className="text-sm text-base-content/70 truncate">简短描述...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="drawer-content">
        <div className="lg:hidden">
          <label htmlFor="character-drawer" className="btn btn-square btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </label>
        </div>

        <div className="p-4">
          {/* 主要内容区域 */}
        </div>
      </div>
    </div>
  );
}
