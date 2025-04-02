/* eslint-disable react-dom/no-missing-button-type */
import CreatCharater from "./creatCharater";

export default function Character() {
  return (
    <div className="h-screen w-screen">
      <div className="h-1/15 w-screen bg-gray-600 border-b-1 border-black"></div>
      <div className="flex h-14/15 bg-gray-500 text-white">

        {/* 左侧边栏 */}
        <div className="w-64 p-4 bg-gray-600 border-r-1 border-black">
          {/* 搜索框 */}
          <div className="mb-8">
            <input
              type="text"
              placeholder="搜索角色"
              className="input input-bordered w-full max-w-xs bg-gray-700 text-white"
            />
          </div>

          {/* 角色数据提示 */}
          <div className="flex flex-col items-center mb-8">
            <img
              src="https://placehold.co/150x150?text=暂无角色数据"
              alt="暂无角色数据"
              className="mb-2"
            />
            <p>暂无角色数据</p>
          </div>
          {/* 创建新角色按钮 */}
          <button
            className="relative btn btn-primary btn-block bg-gray-500 border-1 border-dashed border-amber-100 pl-0.5 h-15 rounder-none text-white
          "
          >
            <div className="bg-gray-700 w-9 h-9 rounded-full text-center pt-1.5 text-gray-800">十</div>
            创建新角色
            <div className="absolute bottom-0 text-xs text-gray-700 left-20">点击创建一个新角色</div>
          </button>
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1">
          {/* 主要内容区域 */}
          <CreatCharater />
        </div>
      </div>
    </div>
  );
}
