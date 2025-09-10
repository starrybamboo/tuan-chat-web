interface CreatePageHeaderProps {
  title: string;
  description: string;
  onBack?: () => void;
  children?: React.ReactNode;
}

/**
 * 创建页面通用头部组件
 * 统一三个创建入口的头部样式和返回按钮
 */
export default function CreatePageHeader({
  title,
  description,
  onBack,
  children,
}: CreatePageHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-8">
      {onBack && (
        <button type="button" className="btn btn-lg btn-outline rounded-md btn-ghost mr-4" onClick={onBack}>
          ← 返回
        </button>
      )}
      <div className="flex-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-base-content/70">
          {description}
          {children}
        </p>
      </div>
    </div>
  );
}
