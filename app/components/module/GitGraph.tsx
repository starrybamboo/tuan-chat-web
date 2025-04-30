// import { useState, useEffect, useRef } from 'react';
// import { Tree } from 'react-d3-tree';
//
// interface GitNode {
//     name: string;
//     attributes: {
//         id: string;
//         type?: 'commit' | 'merge' | 'branch';
//         branch?: string;
//         message?: string;
//         date?: string;
//         author?: string;
//     };
//     children?: GitNode[];
// }
//
// // Custom hook for centering the tree
// const useCenteredTree = (defaultTranslate = { x: 0, y: 0 }) => {
//     const [translate, setTranslate] = useState(defaultTranslate);
//     const containerRef = useRef<HTMLDivElement>(null);
//
//     useEffect(() => {
//         if (containerRef.current) {
//             const { width } = containerRef.current.getBoundingClientRect();
//             setTranslate({ x: width / 2, y: 80 });
//         }
//     }, []);
//
//     return { translate, containerRef };
// };
//
// const GitGraph = ({ data = mockGitNodeData }: { data?: GitNode }) => {
//     const { translate, containerRef } = useCenteredTree();
//     const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
//
//     // Custom node styling based on commit type
//     const renderCustomNode = (
//         rd3tNode: {
//             nodeDatum: GitNode;
//             toggleNode: () => void;
//         }
//     ) => {
//         const { nodeDatum, toggleNode } = rd3tNode;
//         const isMerge = nodeDatum.attributes?.type === 'merge';
//         const isBranch = nodeDatum.attributes?.type === 'branch';
//         const branchColor = getBranchColor(nodeDatum.attributes?.branch || 'main');
//
//         return (
//             <g onClick={toggleNode}>
//                 {/* Node circle */}
//                 <circle
//                     r={15}
//                     fill={branchColor}
//                     stroke={isMerge ? '#333' : branchColor}
//                     strokeWidth={isMerge ? 3 : 2}
//                     strokeDasharray={isMerge ? "5,3" : "0"}
//                 />
//
//                 {/* Node text */}
//                 <text
//                     fill="#333"
//                     stroke="none"
//                     x={orientation === 'horizontal' ? 25 : 0}
//                     y={orientation === 'horizontal' ? 0 : 25}
//                     dy=".35em"
//                     textAnchor={orientation === 'horizontal' ? 'start' : 'middle"}
//                         style={{ fontSize: '12px', fontWeight: 'bold' }}
//                         >
//                     {nodeDatum.name}
//                         </text>
//
//                     {/* Branch label */}
//                     {nodeDatum.attributes?.branch && (
//                         <text
//                         x={orientation === 'horizontal' ? 25 : 0}
//                     y={orientation === 'horizontal' ? 15 : 40}
//                     dy=".35em"
//                     textAnchor={orientation === 'horizontal' ? 'start' : 'middle'}
//                     style={{ fontSize: '10px', fill: branchColor }}
//                 >
//                     {nodeDatum.attributes.branch}
//                 </text>
//                 )}
//             </g>
//         );
//     };
//
//     // Custom path styling based on branch
//     const renderCustomPath = (
//         linkDatum: {
//             source: GitNode;
//             target: GitNode;
//             path: string;
//         }
//     ) => {
//         const sourceBranch = linkDatum.source.attributes?.branch || 'main';
//         const targetBranch = linkDatum.target.attributes?.branch || 'main';
//         const isMerge = linkDatum.target.attributes?.type === 'merge';
//         const isBranch = sourceBranch !== targetBranch;
//
//         const strokeColor = isMerge ? getBranchColor(sourceBranch) : getBranchColor(targetBranch);
//         const strokeDasharray = isMerge ? "5,3" : "none";
//         const strokeWidth = isMerge ? 3 : 2;
//
//         return (
//             <path
//                 d={linkDatum.path}
//                 fill="none"
//                 stroke={strokeColor}
//                 strokeWidth={strokeWidth}
//                 strokeDasharray={strokeDasharray}
//                 markerEnd={isBranch ? `url(#arrow-${targetBranch})` : undefined}
//             />
//         );
//     };
//
//     // Branch color mapping
//     const getBranchColor = (branch: string) => {
//         const colors: Record<string, string> = {
//             'main': '#3b82f6',       // blue-500
//             'develop': '#10b981',    // emerald-500
//             'feature/login': '#f59e0b', // amber-500
//             'feature/auth': '#8b5cf6',  // violet-500
//             'hotfix': '#ef4444',     // red-500
//         };
//         return colors[branch] || `hsl(${Math.abs(hashCode(branch)) % 360}, 70%, 60%)`;
//     };
//
//     // Simple hash function for branch colors
//     const hashCode = (str: string) => {
//         let hash = 0;
//         for (let i = 0; i < str.length; i++) {
//             hash = str.charCodeAt(i) + ((hash << 5) - hash);
//         }
//         return hash;
//     };
//
//     return (
//         <div className="h-screen bg-base-200 p-8 overflow-auto">
//             <div className="flex justify-between items-center mb-6">
//                 <h1 className="text-2xl font-bold text-base-content">Git Commit Graph</h1>
//                 <div className="flex gap-4">
//                     <button
//                         className="btn btn-sm"
//                         onClick={() => setOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
//                     >
//                         Toggle Orientation
//                     </button>
//                 </div>
//             </div>
//
//             <div
//                 ref={containerRef}
//                 className="w-full h-[calc(100%-80px)] border border-base-300 rounded-lg bg-base-100"
//             >
//                 <Tree
//                     data={data}
//                     translate={translate}
//                     orientation={orientation}
//                     renderCustomNodeElement={renderCustomNode}
//                     pathFunc="straight"
//                     pathClassFunc={() => "custom-link"}
//                     renderCustomLinkElement={renderCustomPath}
//                     collapsible={false}
//                     zoom={0.8}
//                     separation={{
//                         siblings: 1.5,
//                         nonSiblings: 2
//                     }}
//                     initialDepth={2}
//                     depthFactor={200}
//                     styles={{
//                         links: {
//                             stroke: '#ccc',
//                             strokeWidth: 2,
//                         },
//                     }}
//                 >
//                     {/* Define arrow markers for branches */}
//                     <defs>
//                         {['main', 'develop', 'feature/login', 'feature/auth', 'hotfix'].map(branch => (
//                             <marker
//                                 key={`arrow-${branch}`}
//                                 id={`arrow-${branch}`}
//                                 markerWidth="10"
//                                 markerHeight="10"
//                                 refX="9"
//                                 refY="5"
//                                 orient="auto"
//                                 markerUnits="strokeWidth"
//                             >
//                                 <path d="M0,0 L10,5 L0,10 Z" fill={getBranchColor(branch)} />
//                             </marker>
//                         ))}
//                     </defs>
//                 </Tree>
//             </div>
//
//             {/* Legend */}
//             <div className="mt-4 flex flex-wrap gap-4">
//                 <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 rounded-full bg-blue-500"></div>
//                     <span className="text-sm">main branch</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
//                     <span className="text-sm">develop branch</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 rounded-full bg-amber-500"></div>
//                     <span className="text-sm">feature branches</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 rounded-full border-2 border-dashed border-red-500"></div>
//                     <span className="text-sm">merge commits</span>
//                 </div>
//             </div>
//         </div>
//     );
// };
//
// // Mock data in format compatible with react-d3-tree
// const mockGitNodeData: GitNode = {
//     name: "Initial commit",
//     attributes: {
//         id: "c1",
//         branch: "main",
//         type: "commit",
//         message: "Project initialization",
//         date: "2023-01-01",
//         author: "dev1"
//     },
//     children: [
//         {
//             name: "Add auth",
//             attributes: {
//                 id: "c2",
//                 branch: "main",
//                 type: "commit",
//                 message: "Add authentication",
//                 date: "2023-01-02",
//                 author: "dev1"
//             },
//             children: [
//                 {
//                     name: "Login form",
//                     attributes: {
//                         id: "c3",
//                         branch: "feature/login",
//                         type: "branch",
//                         message: "Create login UI",
//                         date: "2023-01-03",
//                         author: "dev2"
//                     },
//                     children: [
//                         {
//                             name: "Fix validation",
//                             attributes: {
//                                 id: "c4",
//                                 branch: "feature/login",
//                                 type: "commit",
//                                 message: "Fix form validation",
//                                 date: "2023-01-04",
//                                 author: "dev2"
//                             },
//                             children: [
//                                 {
//                                     name: "Merge login",
//                                     attributes: {
//                                         id: "c5",
//                                         branch: "main",
//                                         type: "merge",
//                                         message: "Merge feature/login",
//                                         date: "2023-01-05",
//                                         author: "dev1"
//                                     }
//                                 }
//                             ]
//                         }
//                     ]
//                 },
//                 {
//                     name: "JWT impl",
//                     attributes: {
//                         id: "c6",
//                         branch: "feature/auth",
//                         type: "branch",
//                         message: "Implement JWT",
//                         date: "2023-01-03",
//                         author: "dev3"
//                     },
//                     children: [
//                         {
//                             name: "Refresh tokens",
//                             attributes: {
//                                 id: "c7",
//                                 branch: "feature/auth",
//                                 type: "commit",
//                                 message: "Add token refresh",
//                                 date: "2023-01-04",
//                                 author: "dev3"
//                             },
//                             children: [
//                                 {
//                                     name: "Merge auth",
//                                     attributes: {
//                                         id: "c8",
//                                         branch: "main",
//                                         type: "merge",
//                                         message: "Merge feature/auth",
//                                         date: "2023-01-06",
//                                         author: "dev1"
//                                     }
//                                 }
//                             ]
//                         }
//                     ]
//                 }
//             ]
//         },
//         {
//             name: "Add dashboard",
//             attributes: {
//                 id: "c9",
//                 branch: "main",
//                 type: "commit",
//                 message: "Initialize dashboard",
//                 date: "2023-01-07",
//                 author: "dev1"
//             },
//             children: [
//                 {
//                     name: "Charts",
//                     attributes: {
//                         id: "c10",
//                         branch: "feature/dashboard",
//                         type: "branch",
//                         message: "Add chart components",
//                         date: "2023-01-08",
//                         author: "dev4"
//                     }
//                 }
//             ]
//         }
//     ]
// };
//
// export default GitGraph;
