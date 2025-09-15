// import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
// import { useState } from "react";
// import toast from "react-hot-toast";
//
// export interface LLMProperty {
//   openaiApiKey?: string;
//   openaiApiBaseUrl?: string;
//   openaiModelName?: string;
// }
//
// export default function SettingsPage() {
//   const [storedLlmSettings, setStoredLlmSettings] = useLocalStorage<LLMProperty>("llmSettings", {
//     openaiApiKey: "",
//     openaiApiBaseUrl: "",
//     openaiModelName: "",
//   });
//
//   const [llmSettings, setLlmSettings] = useState(storedLlmSettings);
//
//   const handleLlmSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setLlmSettings(prevSettings => ({
//       ...prevSettings,
//       [name]: value,
//     }));
//   };
//
//   const saveLlmSettings = (e: React.FormEvent) => {
//     e.preventDefault();
//     toast.success("保存成功");
//     setStoredLlmSettings(llmSettings);
//   };
//
//   return (
//     <div className="min-h-screen bg-base-200 p-6">
//       <div className="max-w-md mx-auto bg-base-100 rounded-box shadow-lg p-6">
//         <h1 className="text-2xl font-bold mb-6 text-center">大语言模型设置</h1>
//         <form onSubmit={saveLlmSettings} className="space-y-4">
//           <div className="form-control">
//             <label className="label" htmlFor="openaiApiKey">
//               <span className="label-text">OpenAI API密钥</span>
//             </label>
//             <input
//               type="password"
//               id="openaiApiKey"
//               name="openaiApiKey"
//               value={llmSettings.openaiApiKey}
//               onChange={handleLlmSettingChange}
//               className="input input-bordered w-full"
//               placeholder="输入您的OpenAI API密钥"
//             />
//           </div>
//
//           <div className="form-control">
//             <label className="label" htmlFor="openaiApiBaseUrl">
//               <span className="label-text">API基础URL</span>
//             </label>
//             <input
//               type="url"
//               id="openaiApiBaseUrl"
//               name="openaiApiBaseUrl"
//               value={llmSettings.openaiApiBaseUrl}
//               onChange={handleLlmSettingChange}
//               className="input input-bordered w-full"
//               placeholder="https://api.openai.com/v1"
//             />
//           </div>
//
//           <div className="form-control">
//             <label className="label" htmlFor="openaiModelName">
//               <span className="label-text">模型名称</span>
//             </label>
//             <input
//               type="text"
//               id="openaiModelName"
//               name="openaiModelName"
//               value={llmSettings.openaiModelName}
//               onChange={handleLlmSettingChange}
//               className="input input-bordered w-full"
//               placeholder="gpt-3.5-turbo"
//             />
//           </div>
//
//           <div className="form-control pt-4">
//             <button
//               type="submit"
//               className="btn btn-primary w-full"
//             >
//               保存设置
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

export default function SettingsPage() {
  return (
    <div className="h-full w-full items-center text-center">页面开发中</div>
  );
}
