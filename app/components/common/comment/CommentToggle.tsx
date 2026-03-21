export default function CommentToggle({
  isFolded,
  onClick,
  className,
}: {
  isFolded: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-base-300 bg-base-100 text-base-content/55 transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary active:scale-95 ${className ?? ""}`}
      aria-label={isFolded ? "展开回复" : "收起回复"}
      aria-expanded={!isFolded}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
    >
      <svg
        className={`h-3.5 w-3.5 transition-transform duration-200 ${isFolded ? "" : "rotate-90"}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  );
}
