import type { ReactNode } from "react";

type FeaturePlaceholderPageProps = {
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
};

export default function FeaturePlaceholderPage({
  title,
  description,
  action,
  compact = false,
}: FeaturePlaceholderPageProps) {
  return (
    <div className={compact
      ? "flex size-full items-center justify-center p-4"
      : "size-full overflow-y-auto bg-base-200 p-4 sm:p-6"}
    >
      <div className="mx-auto flex size-full max-w-3xl items-center justify-center">
        <section className="
          w-full rounded-2xl border border-base-300 bg-base-100 px-6 py-12
          text-center shadow-sm sm:px-10
        ">
          <h1 className="text-2xl/tight font-semibold">{title}</h1>
          <p className="mt-3 text-base text-base-content/70">{description}</p>
          {action ? <div className="mt-6">{action}</div> : null}
        </section>
      </div>
    </div>
  );
}
