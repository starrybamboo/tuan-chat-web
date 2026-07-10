export default function RepositoryForm({ register, errors }: {
  register: any;
  errors: any;
}) {
  return (
    <>
      <div className="mb-4">
        <p className="text-xl font-bold mb-5 text-info">2. 填写仓库信息</p>
        <p className="mb-1 text-base-content/70">作者</p>
        <input
          className="
            rounded-md w-full h-10 px-3 py-2 border-2 border-base-300
            dark:border-base-content/20
            focus:outline-none focus:border-info focus:ring-2 focus:ring-info/20
          "
          type="text"
          autoComplete="off"
          aria-label="作者"
          placeholder="你的署名"
          {...register("authorName", {
            required: "仓库作者是必填项",
            maxLength: { value: 255, message: "作者名不能超过255个字符" },
          })}
        />
        <p className="label text-sm text-error">{errors.authorName?.message}</p>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-base-content/70">仓库名</p>
        <input
          className="
            rounded-md w-full h-10 px-3 py-2 border-2 border-base-300
            dark:border-base-content/20
            focus:outline-none focus:border-info focus:ring-2 focus:ring-info/20
          "
          type="text"
          autoComplete="off"
          aria-label="仓库名"
          placeholder="仅字母数字与连字符"
          {...register("repositoryName", {
            required: "仓库名称是必填项",
            maxLength: { value: 255, message: "仓库名不能超过255个字符" },
          })}
        />
        <p className="label text-sm text-error">{errors.repositoryName?.message}</p>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-base-content/70">仓库描述</p>
        <textarea
          className="
            rounded-md w-full h-20 px-3 py-2 border-2 border-base-300
            dark:border-base-content/20
            focus:outline-none focus:border-info focus:ring-2 focus:ring-info/20
          "
          placeholder="一句话介绍仓库内容"
          autoComplete="off"
          aria-label="仓库描述"
          {...register("description", {
            required: "仓库描述是必填项",
            maxLength: { value: 255, message: "仓库描述不能超过255个字符" },
          })}
        />
        <p className="label text-sm text-error">{errors.description?.message}</p>
      </div>
    </>
  );
}
