import toastWindow from "@/components/common/toastWindow";
import React, { useRef } from "react";
import useSearchParamsState from "../customHooks/useSearchParamState";
import CopyLinkButton from "./copyLinkButton";
import SavePictureButton from "./savePictureButton";

interface ShareIconButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  qrLink: string;
  searchKey: string;
  className?: string;
  title?: string;
}

export default function ShareIconButton({
  targetRef,
  qrLink,
  searchKey,
  className,
  title,
}: ShareIconButtonProps) {
  const [showShare, setShowShare] = useSearchParamsState<boolean>(searchKey, false);

  // 保存当前 toastWindow 返回的实例，便于后续 update / close
  const toastRef = useRef<{ update: (c: React.ReactNode) => void; close: () => void } | null>(null);

  const openShareWindow = () => {
    if (toastRef.current)
      return;

    setShowShare(true);

    const instance = toastWindow(
      () => (
        <div className="overflow-y-auto space-y-4 h-[40vh] w-[30vw] flex flex-col items-center justify-center p-4">
          <h2 className="text-xl font-bold">分享方式</h2>
          <div className="flex gap-4 mt-4">
            <SavePictureButton targetRef={targetRef} qrLink={qrLink} />
            <CopyLinkButton title={title} />
          </div>
        </div>
      ),
      {
        fullScreen: false,
        transparent: false,
        onclose: () => {
          setShowShare(false);
          toastRef.current = null;
        },
      },
    );

    toastRef.current = instance;
  };

  return (
    <div>
      <button
        type="button"
        className={`w-12 h-8 flex items-center justify-center join-item btn btn-sm btn-ghost ${className ?? ""}`}
        onClick={openShareWindow}
        aria-expanded={showShare}
        aria-controls={`share-pop-${searchKey}`}
        title="分享"
      >
        <div className="w-5 h-5">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="scale(1.2) translate(-2,-2)">
              <path d="M14 5v4C7 10 4 15 3 20c2.5-3.5 6-5.1 11-5.1V19l7-7zm2 4.83L18.17 12L16 14.17V12.9h-2c-2.07 0-3.93.38-5.66.95c1.4-1.39 3.2-2.48 5.94-2.85l1.72-.27z" />
            </g>
          </svg>
        </div>
      </button>
    </div>
  );
}
