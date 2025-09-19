import { CharacterCopper } from "@/components/newCharacter/sprite/CharacterCopper";
import { useCallback, useState } from "react";
import { Controller } from "react-hook-form";

export default function ModuleCoverImage({
  setValue,
  control,
  errors,
}: {
  setValue: any;
  control: any;
  errors: any;
}) {
  // 模组图片的裁切后版本, 仅用于展示, 实际上传的url储存在form中
  const [moduleAvatarUrl, setModuleAvatarUrl] = useState<string>("");
  // 设置模组头像
  const setAvatar = useCallback((avatar: string) => {
    setValue("image", avatar);
  }, [setValue]);
    // 生成唯一的模组头像名称, 避免覆盖
  const uniqueModuleAvatarName = `module_avatar_${Date.now()}`;

  return (
    <div
      className={`basis-1/3 flex items-center justify-center relative ${errors.image ? "border-2 border-error rounded-lg" : ""
      }`}
    >
      <Controller
        control={control}
        name="image"
        rules={{ required: "请上传模组封面" }}
        render={({ field: { onChange } }) => (
          <CharacterCopper
            fileName={uniqueModuleAvatarName}
            setDownloadUrl={(url) => {
              onChange(url);
              setAvatar(url);
            }}
            scene={4}
            setCopperedDownloadUrl={setModuleAvatarUrl}
            wrapperClassName="w-full h-full"
            triggerClassName="w-full h-full"
          >
            <div className="h-full w-full bg-base-300 rounded-lg border-2 border-dashed border-base-content/30 hover:border-primary hover:bg-base-200 transition-colors cursor-pointer flex flex-col items-center justify-center group">
              {moduleAvatarUrl
                ? (
                    <div className="relative w-full h-full">
                      <img
                        src={moduleAvatarUrl}
                        alt="模组头像"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                    </div>
                  )
                : (
                    <>
                      <svg
                        className="w-8 h-8 text-base-content/50 group-hover:text-primary mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="text-xs text-base-content/60 group-hover:text-primary text-center">
                        点击上传
                        <br />
                        模组封面
                      </span>
                    </>
                  )}
            </div>
          </CharacterCopper>
        )}
      />
      {errors.image && (
        <div className="absolute -bottom-6 left-0 text-error text-xs">
          {typeof errors.image.message === "string"
            ? errors.image.message
            : "请上传模组封面"}
        </div>
      )}
    </div>
  );
}
