export function AvatarLibraryTab() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-2 flex-shrink-0 min-h-8">
        <h3 className="text-lg font-semibold">素材库</h3>
      </div>

      <div className="flex-1 min-h-0 relative bg-base-200 rounded-lg overflow-hidden">
        <div className="absolute inset-0 overflow-auto p-4">
          <div className="flex flex-col items-center justify-center h-full text-base-content/60 text-sm">
            正在开发中，支持利用素材库设置头像立绘
          </div>
        </div>
      </div>
    </div>
  );
}
