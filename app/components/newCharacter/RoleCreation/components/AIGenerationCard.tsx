interface AIGenerationCardProps {
  title: string;
  description: string;
  placeholder: string;
  prompt: string;
  isGenerating: boolean;
  disabled?: boolean;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  onExcelImport?: () => void;
}

export default function AIGenerationCard({
  title,
  description,
  placeholder,
  prompt,
  isGenerating,
  disabled = false,
  onPromptChange,
  onGenerate,
  onExcelImport,
}: AIGenerationCardProps) {
  return (
    <div className="card bg-gradient-to-br rounded-xl from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-dashed border-purple-300 dark:border-purple-600">
      <div className="card-body mt-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 dark:from-purple-500 dark:to-pink-500 flex items-center justify-center">
            {/* <span className="text-white text-xl">🤖</span> */}
          </div>
          <div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-pink-400 dark:from-purple-300 dark:to-pink-300 bg-clip-text text-transparent">
              {title}
            </h3>
            <p className="text-sm text-base-content/70 dark:text-base-content/80">{description}</p>
          </div>
        </div>
        <div className="space-y-3">
          <textarea
            className={`textarea textarea-bordered rounded-md w-full min-h-[120px] bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            placeholder={placeholder}
            value={prompt}
            disabled={disabled}
            onChange={e => onPromptChange(e.target.value)}
          />
          <div className="flex gap-4">
            <button
              type="button"
              className={`btn btn-primary text-white rounded-md flex-1 bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-600 dark:to-pink-600 border-none hover:from-purple-600 hover:to-pink-600 dark:hover:from-purple-700 dark:hover:to-pink-700 ${disabled || isGenerating ? "btn-disabled" : ""}`}
              onClick={onGenerate}
              disabled={disabled || isGenerating}
            >
              {isGenerating
                ? (
                    <>
                      <span className=" loading loading-spinner loading-sm"></span>
                      AI生成中...
                    </>
                  )
                : (
                    <>
                      AI智能生成
                    </>
                  )}
            </button>
            <button type="button" className="btn btn-outline rounded-md text-purple-400 dark:text-purple-300 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-400 dark:hover:border-purple-500" onClick={onExcelImport}>
              Excel导入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
