import { useModuleForm } from "./hooks/useModuleForm";
import ModuleCoverImage from "./ModuleCoverImage";
import ModuleForm from "./ModuleForm";
import ModulePopWindow from "./ModulePopWindow";
import RuleSelector from "./RuleSelector";

export default function ModuleCreate2() {
  const { register, handleSubmit, control, setValue, errors, submit, modalOpen, setModalOpen, ruleId } = useModuleForm();

  return (
    // Bootstrap 容器类
    <div className="ml-auto mr-auto max-w-6xl">
      <header className="flex flex-col items-center justify-center gap-4 mt-10">
        <h1 className="text-3xl font-bold">创建模组</h1>
        <p className="text-gray-600 text-lg">在这里你可以创建你的模组，上传相关的初步的描述信息。若要丰富模组内容，请前往创作页。</p>
      </header>
      <form onSubmit={handleSubmit(submit)}>
        <main className="flex flex-col md:flex-row">
          {/* 规则选择 */}
          <aside className="flex-1/3 mt-14 px-5">
            <h2 className="text-xl font-bold mb-5">规则选择</h2>
            <RuleSelector value={ruleId} onChange={setValue} />
          </aside>
          <section className="flex-2/3 mt-14 px-5">
            { /* 模组信息 */}
            <ModuleForm register={register} errors={errors} />
            {/* 模组封面 */}
            <ModuleCoverImage
              setValue={setValue}
              control={control}
              errors={errors}
            />
            <button type="submit" className="w-full px-3 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700">创建模组</button>
          </section>
        </main>
      </form>
      {/* 模组创建成功弹窗 */}
      <ModulePopWindow
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
      />
    </div>
  );
}
