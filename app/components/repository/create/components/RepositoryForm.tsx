export default function RepositoryForm({ register, errors }: {
  register: any;
  errors: any;
}) {
  return (
    <>
      <div className="mb-4">
        <p className="text-xl font-bold mb-5 text-cyan-600">2. 填写仓库信息</p>
        <p className="mb-1 text-cyan-600">作者</p>
        <input
          className="rounded-md w-full h-10 px-3 py-2 border-2 border-gray-300 dark:border-gray-500 focus:outline-none focus:border-info"
          type="text"
          placeholder=""
          {...register("authorName", {
            required: "仓库作者是必填项",
            maxLength: { value: 255, message: "作者名不能超过255个字符" },
          })}
        />
        <p className="label text-sm text-error">{errors.authorName?.message}</p>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-cyan-600">仓库名</p>
        <input
          className="rounded-md w-full h-10 px-3 py-2 border-2 border-gray-300 dark:border-gray-500 focus:outline-none focus:border-info"
          type="text"
          placeholder=""
          {...register("repositoryName", {
            required: "仓库名称是必填项",
            maxLength: { value: 255, message: "仓库名不能超过255个字符" },
          })}
        />
        <p className="label text-sm text-error">{errors.repositoryName?.message}</p>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-cyan-600">仓库描述</p>
        <textarea
          className="rounded-md w-full h-20 px-3 py-2 border-2 border-gray-300 dark:border-gray-500 focus:outline-none focus:border-info"
          placeholder=""
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
