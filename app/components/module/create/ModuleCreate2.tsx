import { useState } from "react";
import { useForm } from "react-hook-form";
import ModuleForm from "./ModuleForm";
import RuleSelector from "./RuleSelector";

export default function ModuleCreate2() {
  const [selectedRule, setSelectedRule] = useState(1);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      authorName: "",
      moduleName: "",
      description: "",
      image: "",
    },
  });

  return (
  // Bootstrap 容器类
    <div className="ml-auto mr-auto max-w-6xl">
      <header className="flex flex-col items-center justify-center gap-4 mt-10">
        <h1 className="text-3xl font-bold">创建模组</h1>
        <p className="text-gray-600 text-lg">在这里你可以创建你的模组</p>
      </header>
      <form action="" onSubmit={handleSubmit(() => { })}>
        <main className="flex flex-col md:flex-row">
          {/* 规则选择 */}
          <aside className="flex-1/3 mt-14 px-5">
            <h2 className="text-xl font-bold mb-5">规则选择</h2>
            <RuleSelector value={selectedRule} onChange={setSelectedRule} />
          </aside>
          { /* 模组信息 */ }
          <section className="flex-2/3 mt-14 px-5">
            <ModuleForm register={register} errors={errors} />
            <button type="submit" className="w-full px-3 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700">创建模组</button>
          </section>

        </main>
      </form>
    </div>
  );
}
