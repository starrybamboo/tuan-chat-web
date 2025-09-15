// import { Graph } from "@antv/g6";
// import { useEffect, useRef } from "react";
// import { edgeOption, formatter, nodeOption, tooltipOption } from "./utils";
// import "./utils/gitLayout";
// import "./utils/gitNode";

// const mockData = {
//   branches: [
//     {
//       name: "main",
//       headCommitId: 9,
//     },
//     {
//       name: "other",
//       headCommitId: 8,
//     },
//   ],
//   commits: [
//     {
//       commitId: "A",
//       message: "Initial commit on main,Initial commit on main,Initial commit on main,Initial commit on main,Initial commit on main,Initial commit on main",
//       firstParentId: null,
//       secondParentId: null,
//       branch: "main",
//       depth: 0,
//     },
//     {
//       commitId: "B",
//       message: "Add feature B",
//       firstParentId: "A",
//       secondParentId: null,
//       branch: "main",
//       depth: 1,
//     },
//     {
//       commitId: "C",
//       message: "Update C",
//       firstParentId: "B",
//       secondParentId: null,
//       branch: "main",
//       depth: 2,
//     },
//     {
//       commitId: "D",
//       message: "Fix bug in D",
//       firstParentId: "C",
//       secondParentId: null,
//       branch: "main",
//       depth: 3,
//     },
//     {
//       commitId: "E",
//       message: "Main continues with E",
//       firstParentId: null,
//       secondParentId: "D",
//       branch: "other",
//       depth: 3,
//     },
//     {
//       commitId: "F",
//       message: "Add F",
//       firstParentId: "E",
//       secondParentId: null,
//       branch: "other",
//       depth: 4,
//     },
//     {
//       commitId: "G",
//       message: "Update G",
//       firstParentId: "F",
//       secondParentId: null,
//       branch: "other",
//       depth: 5,
//     },
//     {
//       commitId: "H",
//       message: "Finalize H",
//       firstParentId: "G",
//       secondParentId: null,
//       branch: "other",
//       depth: 6,
//     },
//     {
//       commitId: "I",
//       message: "Merge branch 'other' into main",
//       branch: "main",
//       firstParentId: "D",
//       secondParentId: "H",
//       depth: 7,
//     },
//   ],
// };

// function GitGraph() {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const graphRef = useRef<Graph | null>(null);

//   useEffect(() => {
//     if (!containerRef.current)
//       return;

//     const resizeObserver = new ResizeObserver((entries) => {
//       const entry = entries[0];
//       if (entry.contentRect.width === 0 || entry.contentRect.height === 0)
//         return;

//       // 如果图表已经初始化，则不需要再次初始化
//       if (graphRef.current)
//         return;

//       const { nodes, edges } = formatter(mockData);
//       const graph = new Graph({
//         container: containerRef.current!,
//         width: entry.contentRect.width,
//         height: entry.contentRect.height,
//         data: {
//           nodes,
//           edges,
//         },
//         autoResize: true,
//         autoFit: {
//           type: "view",
//           options: {
//             when: "always",
//             direction: "x",
//           },
//         },
//         padding: 20,
//         layout: {
//           type: "git-graph-layout",
//         },
//         node: nodeOption,
//         edge: edgeOption,
//         behaviors: [{
//           type: "scroll-canvas",
//           key: "scroll-canvas",
//           range: 0.5,
//           preventDefault: false,
//           direction: "y",
//         }],
//         plugins: [tooltipOption],
//       });

//       graph.render();
//       graphRef.current = graph;
//     });

//     // 开始观察容器尺寸变化
//     resizeObserver.observe(containerRef.current);

//     // 清理函数
//     return () => {
//       resizeObserver.disconnect();
//       if (graphRef.current) {
//         graphRef.current.destroy();
//         graphRef.current = null;
//       }
//     };
//   }, []);

//   return (
//     <div ref={containerRef} className="w-full h-full bg-base-100"></div>
//   );
// }

// export default GitGraph;
