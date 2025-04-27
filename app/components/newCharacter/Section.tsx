// Section.tsx（通用模块容器）
export default function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`collapse collapse-arrow border border-base-300 ${className}`}>
      <input type="checkbox" defaultChecked />
      <div className="collapse-title text-xl font-medium">
        {title}
      </div>
      <div className="collapse-content">
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
