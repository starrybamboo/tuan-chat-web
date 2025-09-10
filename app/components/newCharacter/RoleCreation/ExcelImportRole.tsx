import CreatePageHeader from "./components/CreatePageHeader";

export default function ExcelImportRole({ onBack }: { onBack?: () => void }) {
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 头部 */}
      <CreatePageHeader
        title="Excel导入角色"
        description="通过Excel文件批量导入角色数据"
        onBack={onBack}
      />

      <div>ExcelImport功能开发中...</div>
    </div>
  );
}
