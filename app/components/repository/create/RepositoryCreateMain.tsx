import RepositoryCoverImage from "./components/RepositoryCoverImage";
import RepositoryForm from "./components/RepositoryForm";
import RepositoryPopWindow from "./components/RepositoryPopWindow";
import RuleSelector from "./components/RuleSelector";
import { useGoToWorkSpace } from "./hooks/useGoToWorkSpace";
import { useRepositoryForm } from "./hooks/useRepositoryForm";

export default function RepositoryCreateMain() {
  const { register, handleSubmit, control, setValue, errors, submit, modalOpen, setModalOpen, ruleId } = useRepositoryForm();
  const { goToWorkSpace } = useGoToWorkSpace();

  return (
    // Bootstrap 容器类
    <div className="ml-auto mr-auto max-w-6xl">
      <header className="flex flex-col items-center justify-center gap-4 mt-10 md:mt-16 px-4">
        <h1 className="text-3xl font-bold">创建你的专属仓库</h1>
        <p className="text-gray-600 dark:text-gray-300 text-lg mt-4">
          为你的故事设定规则，填写基础信息。想添加更多细节？随时可以前往
          <a onClick={() => goToWorkSpace()} className="cursor-pointer font-semibold text-blue-600 hover:text-indigo-600 transition">创作工作台</a>
          进行丰富。
        </p>
      </header>
      <form onSubmit={handleSubmit(submit)}>
        <main className="flex flex-col md:flex-row gap-8 mt-12 py-10 px-4 md:border md:border-base-300 md:rounded-lg md:shadow-sm">
          {/* 规则选择 */}
          <RuleSelector value={ruleId} onChange={setValue} />
          {/* <RulesSection currentRuleId={ruleId} onRuleChange={(id) => setValue("ruleId", id)} large={false} /> */}
          <section className="flex-2/3 px-5 md:border-l md:border-base-300 ">
            { /* 仓库信息 */ }
            <RepositoryForm register={register} errors={errors} />
            {/* 仓库封面 */}
            <RepositoryCoverImage
              setValue={setValue}
              control={control}
              errors={errors}
            />
            {/* 提交按钮 */}
            <button type="submit" className="mt-6 w-full px-3 py-2 cursor-pointer text-white rounded-xl font-bold text-lg shadow-md bg-indigo-600 hover:bg-indigo-700 dark:bg-green-600 dark:hover:bg-green-700 transition-all duration-200">创建仓库</button>
          </section>
        </main>
      </form>
      {/* 仓库创建成功弹窗 */}
      <RepositoryPopWindow
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        goToWorkSpace={goToWorkSpace}
      />
    </div>
  );
}
