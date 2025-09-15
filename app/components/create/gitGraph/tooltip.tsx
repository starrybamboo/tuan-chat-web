// import type { GitNodeData } from "./utils/types";

// const testImage = "http://39.103.58.31:9000/avatar/emoji/userId-10020-coppered_1746242587555.webp";

// function GitToolTip({
//   gitNodeData,
// }: {
//   gitNodeData: GitNodeData;
// }) {
//   return (
//     <div className="flex flex-col gap-2 p-2 font-sans bg-base-300 rounded-md shadow-lg min-w-[200px]">
//       {/* 用户信息部分 */}
//       <div className="flex items-center border-b pb-2">
//         <img
//           className="w-[36px] h-[36px] rounded-full"
//           src={testImage}
//           alt="用户头像"
//         />
//         <div className="ml-2">
//           <div className="text-sm font-medium text-base-content/60">NenoSannn</div>
//           <div className="text-xs text-base-content/60">提交者</div>
//         </div>
//       </div>

//       {/* 提交信息部分 */}
//       <div className="flex flex-col gap-1">
//         <p className="text-sm break-all max-w-48 whitespace-pre-wrap text-base-content/60">
//           {gitNodeData.data.message || "无提交信息"}
//         </p>

//         {/* 提交详情 */}
//         <div className="flex flex-col gap-1 text-xs text-base-content/80 mt-1">
//           <div className="flex justify-between">
//             <span>提交ID:</span>
//             <span className="font-mono">{gitNodeData.id}</span>
//           </div>
//           <div className="flex justify-between">
//             <span>分支:</span>
//             <span className="font-mono">{gitNodeData.data.branch}</span>
//           </div>
//           <div className="flex justify-between">
//             <span>深度:</span>
//             <span>{gitNodeData.data.depth}</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default GitToolTip;
