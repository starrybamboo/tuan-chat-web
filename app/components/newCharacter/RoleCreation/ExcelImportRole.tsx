export default function ExcelImportRole({ onBack }: { onBack?: () => void }) {
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 头部 */}
      <div className="flex items-center gap-4 mb-8">
        {onBack && (
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← 返回
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold">Excel导入角色</h1>
          <p className="text-base-content/70">
            通过Excel文件批量导入角色数据
          </p>
        </div>
      </div>

      <div>ExcelImport功能开发中...</div>
    </div>
  );
}
