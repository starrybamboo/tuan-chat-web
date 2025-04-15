import { useState } from "react";
import CharacterDisplay from "./CharacterDisplay";
import CharacterEditing from "./CharacterEditing";

export default function CharacterMain() {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

  return (
    <div className="drawer lg:drawer-open">
      <input id="character-drawer" type="checkbox" className="drawer-toggle" />

      {/* 侧边导航栏 */}
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
              onClick={() => setIsEditing(true)}
            >
              <span className="text-xl">+</span>
            </button>
          </div>

          {/* 角色列表 */}
          <div className="space-y-2 overflow-y-auto">
            {/* 示例角色项 */}
            <div
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-100 cursor-pointer transition-colors"
              onClick={() => {
                setSelectedCharacter("1");
                setIsEditing(false);
              }}
            >
              <div className="avatar">
                <div className="w-12 rounded-full">
                  <div className="bg-neutral-content w-full h-full flex items-center justify-center">
                    <span className="text-neutral text-xs">头像</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-base truncate">示例角色名称</h3>
                <p className="text-sm text-base-content/70 truncate">这是一个简短的角色描述...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="drawer-content">
        {/* 移动端菜单按钮 */}
        <div className="lg:hidden">
          <label htmlFor="character-drawer" className="btn btn-square btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </label>
        </div>

        {/* 内容展示区域 */}
        <div className="p-4">
          {isEditing
            ? (
                <CharacterEditing />
              )
            : selectedCharacter
              ? (
                  <div className="space-y-4">
                    <CharacterDisplay
                      name="示例角色名称"
                      description="这是一个完整的角色描述，可以包含更多详细信息..."
                    />
                    <div className="card bg-base-100 shadow-xl">
                      <div className="card-body">
                        <div className="flex items-start gap-4">
                          <div className="avatar">
                            <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                              <div className="bg-neutral-content w-full h-full flex items-center justify-center">
                                <span className="text-neutral">规则</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h2 className="card-title text-xl mb-2">选择规则</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="form-control w-full">
                                <label className="label">
                                  <span className="label-text">规则类型 A</span>
                                </label>
                                <select className="select select-bordered w-full">
                                  <option disabled selected>选择规则</option>
                                  <option>规则 A1</option>
                                  <option>规则 A2</option>
                                  <option>规则 A3</option>
                                </select>
                              </div>
                              <div className="form-control w-full">
                                <label className="label">
                                  <span className="label-text">规则类型 B</span>
                                </label>
                                <select className="select select-bordered w-full">
                                  <option disabled selected>选择规则</option>
                                  <option>规则 B1</option>
                                  <option>规则 B2</option>
                                  <option>规则 B3</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              : (
                  <div className="flex items-center justify-center h-[calc(100vh-2rem)]">
                    <div
                      className="card w-96 bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
                      onClick={() => setIsEditing(true)}
                    >
                      <div className="card-body items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <span className="text-4xl text-primary">+</span>
                        </div>
                        <h2 className="card-title">创建新角色</h2>
                        <p className="text-base-content/70">开始创建您的第一个角色</p>
                      </div>
                    </div>
                  </div>
                )}
        </div>
      </div>
    </div>
  );
}
