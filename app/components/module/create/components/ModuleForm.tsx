export default function ModuleForm({ register, errors }: {
  register: any;
  errors: any;
}) {
  return (
    <>
      <div className="mb-4">
        <p className="text-xl font-bold mb-5 text-cyan-600">2. 填写模组信息</p>
        <p className="mb-1 text-cyan-600">作者</p>
        <input
          className="rounded-md w-full h-10 px-3 py-2 border-2 border-gray-300 dark:border-gray-500 focus:outline-none focus:border-info"
          type="text"
          placeholder=""
          {...register("authorName", {
            required: "模组作者是必填项",
            maxLength: { value: 20, message: "作者名不能超过20个字符" },
          })}
        />
        <p className="label text-sm text-error">{errors.authorName?.message}</p>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-cyan-600">模组名</p>
        <input
          className="rounded-md w-full h-10 px-3 py-2 border-2 border-gray-300 dark:border-gray-500 focus:outline-none focus:border-info"
          type="text"
          placeholder=""
          {...register("moduleName", {
            required: "模组名称是必填项",
            maxLength: { value: 20, message: "模组名不能超过20个字符" },
          })}
        />
        <p className="label text-sm text-error">{errors.moduleName?.message}</p>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-cyan-600">模组描述</p>
        <textarea
          className="rounded-md w-full h-20 px-3 py-2 border-2 border-gray-300 dark:border-gray-500 focus:outline-none focus:border-info"
          placeholder=""
          {...register("description", {
            required: "模组描述是必填项",
            maxLength: { value: 50, message: "模组描述不能超过50个字符" },
          })}
        />
        <p className="label text-sm text-error">{errors.description?.message}</p>
      </div>
    </>
  );
}
