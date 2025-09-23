import ModuleCoverImage from "./components/ModuleCoverImage";
import ModuleForm from "./components/ModuleForm";
import ModulePopWindow from "./components/ModulePopWindow";
import RuleSelector from "./components/RuleSelector";
import { useGoToWorkSpace } from "./hooks/useGoToWorkSpace";
import { useModuleForm } from "./hooks/useModuleForm";

export default function ModuleCreateMain() {
  const { register, handleSubmit, control, setValue, errors, submit, modalOpen, setModalOpen, ruleId } = useModuleForm();
  const { goToWorkSpace } = useGoToWorkSpace();

  return (
    // Bootstrap 容器类
    <div className="ml-auto mr-auto max-w-6xl pb-20">
      <header className="flex flex-col items-center justify-center gap-4 mt-10 px-4">
        <h1 className="text-3xl font-bold">创建模组</h1>
        <p className="text-gray-600 text-lg">
          在这里你可以创建你的模组，上传相关的初步的描述信息。若要进一步丰富模组内容，请前往
          <a onClick={() => goToWorkSpace()} className="cursor-pointer text-blue-500">创作</a>
          页。
        </p>
      </header>
      <form onSubmit={handleSubmit(submit)}>
        <main className="flex flex-col md:flex-row">
          { /* 规则选择 */ }
          <RuleSelector value={ruleId} onChange={setValue} />
          <section className="flex-2/3 mt-14 px-5">
            { /* 模组信息 */ }
            <ModuleForm register={register} errors={errors} />
            { /* 模组封面 */ }
            <ModuleCoverImage
              setValue={setValue}
              control={control}
              errors={errors}
            />
            { /* 提交按钮 */ }
            <button type="submit" className="mt-4 w-full px-3 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700">创建模组</button>
          </section>
        </main>
      </form>
      {/* 模组创建成功弹窗 */}
      <ModulePopWindow
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        goToWorkSpace={goToWorkSpace}
      />
    </div>
  );
}
