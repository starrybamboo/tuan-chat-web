import { PopWindow } from "@/components/common/popWindow";
import React, { useState } from "react";

function BetterImg({ src, className, onClose }: { src: string | File | undefined; className?: string; onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const imgSrc = typeof src === "string" || !src ? src : URL.createObjectURL(src);
  return (
    <div>
      <div className="relative inline-block group">
        <img src={imgSrc} className={`${className} hover:scale-105`} alt="img" onClick={() => setIsOpen(true)} />
        {
          onClose && (
            <button
              type="button"
              className="btn btn-xs btn-circle absolute right-0 top-0 absolute opacity-0 group-hover:opacity-100 scale-50 duration-200 origin-top-right"
              onClick={onClose}
            >
              <span className="text-xs">✕</span>
            </button>
          )
        }
      </div>

      <PopWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <img src={imgSrc} className="max-h-[70vh] max-w-[70wh]" alt="img" />
      </PopWindow>
    </div>
  );
}

export default BetterImg;
