import React from "react";
import toast from "react-hot-toast";

export function confirmToast(onConfirm: () => void, info: string, title?: string) {
  toast(t => (
    <div className="alert shadow-lg">
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div>
          {title
            && <h3 className="font-bold">{title}</h3>}
          <div className="text-xs">{info}</div>
        </div>
      </div>
      <div className="flex-none gap-2">
        <button className="btn btn-sm btn-ghost" onClick={() => toast.dismiss(t.id)} type="button">取消</button>
        <button
          className="btn btn-sm btn-error"
          type="button"
          onClick={onConfirm}
        >
          确认
        </button>
      </div>
    </div>
  ), { duration: Infinity, position: "top-center" });
};
