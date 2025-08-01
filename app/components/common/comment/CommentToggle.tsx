import { useState } from "react";

export default function CommentToggle({
  isFolded,
  onClick,
}: {
  isFolded: boolean;
  onClick?: () => void;
}) {
  const [checked, setChecked] = useState(isFolded);

  const handleChange = () => {
    setChecked(!checked);
    if (onClick) {
      onClick();
    }
  };

  return (
    <label className="swap swap-rotate hover:text-primary hover:cursor-pointer">
      {/* Hidden checkbox controls the state */}
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        onClick={e => e.stopPropagation()}
      />

      {/* Expanded state (minus icon) */}
      <svg
        className="swap-on fill-current size-5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" className="stroke-current" fill="none" strokeWidth="2" />
        <path stroke="currentColor" strokeWidth="2" d="M8 12h8" />
      </svg>

      {/* Collapsed state (plus icon) */}
      <svg
        className="swap-off fill-current size-5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" className="stroke-current" fill="none" strokeWidth="2" />
        <path stroke="currentColor" strokeWidth="2" d="M12 8v8m-4-4h8" />
      </svg>
    </label>
  );
}
