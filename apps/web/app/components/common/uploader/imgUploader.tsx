/**
 * 改成了返回图片文件，而不是上传后再返回服务器的下载url
 */

import React, { useRef } from "react";

import { normalizeImageFileOrNull } from "@/utils/media/mediaMime";

type ImgUploaderProps = {
  // 一个函数, 如果useState的话就填set函数. 会在返回后将Img File作为参数传入
  setImg: (downLoadUrl: File) => void;
  children: React.ReactNode;
}

type TriggerElementProps = React.HTMLAttributes<HTMLElement> & {
  disabled?: boolean;
};

/**
 * 图片上传组件
 * @param setImg 当图片文件加载成功时调用的函数
 * @param children
 * @constructor
 */
export function ImgUploader({
  setImg,
  children,
}: ImgUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const imageFile = file ? await normalizeImageFileOrNull(file) : null;
    if (!imageFile) {
      e.target.value = "";
      return;
    }
    setImg(imageFile);
    if (e.target) {
      e.target.value = "";
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const renderTrigger = () => {
    if (!React.isValidElement<TriggerElementProps>(children)) {
      return (
        <span
          className="contents"
          role="button"
          tabIndex={0}
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing)
              return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
        >
          {children}
        </span>
      );
    }

    const childProps = children.props;
    const isNativeButton = children.type === "button";
    const isDisabled = childProps.disabled === true;

    // eslint-disable-next-line react/no-clone-element -- preserve caller-provided trigger markup while adding upload behavior.
    return React.cloneElement(children, {
      role: isNativeButton ? childProps.role : (childProps.role ?? "button"),
      tabIndex: isNativeButton ? childProps.tabIndex : (childProps.tabIndex ?? 0),
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        childProps.onClick?.(event);
        if (!event.defaultPrevented && !isDisabled) {
          openFilePicker();
        }
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        childProps.onKeyDown?.(event);
        if (event.defaultPrevented || isNativeButton || isDisabled) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openFilePicker();
        }
      },
    });
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      {renderTrigger()}
    </div>
  );
}
