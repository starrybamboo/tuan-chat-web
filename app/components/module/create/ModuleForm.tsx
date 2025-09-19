export default function ModuleForm({ register, errors }: {
  register: any;
  errors: any;
}) {
  return (
    <>
      <div className="mb-4">
        <p className="text-xl font-bold mb-5">作者</p>
        <input
          className="rounded-md w-full h-10 px-3 py-2 border-2 border-gray-300 focus:outline-none focus:border-info"
          type="text"
          placeholder="请输入模组作者"
          {...register("authorName", { required: "模组作者是必填项" })}
        />
        <p className="label text-error">{errors.authorName?.message}</p>
      </div>

      <div className="mb-4">
        <p className="text-xl font-bold mb-5">模组名</p>
        <input
          className="rounded-md w-full h-10 px-3 py-2 border-2 border-gray-300 focus:outline-none focus:border-info"
          type="text"
          placeholder="请输入模组名称"
          {...register("moduleName", { required: "模组名称是必填项" })}
        />
        <p className="label text-error">{errors.moduleName?.message}</p>
      </div>

      <div className="mb-4">
        <p className="text-xl font-bold mb-5">模组描述</p>
        <textarea
          className="rounded-md w-full h-20 px-3 py-2 border-2 border-gray-300 focus:outline-none focus:border-info"
          placeholder="请输入对模组的简要描述"
          {...register("description", { required: "模组描述是必填项" })}
        />
        <p className="label text-error">{errors.description?.message}</p>
      </div>
    </>
  );
}
