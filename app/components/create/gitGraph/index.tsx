import { Graph } from "@antv/g6";
import { useEffect, useRef } from "react";
import { edgeOption, formatter, nodeOption, tooltipOption } from "./utils";
import "./utils/gitLayout";
import "./utils/gitNode";

const mockData = {
  branches: [
    {
      name: "main",
      headCommitId: 9,
    },
    {
      name: "other",
      headCommitId: 8,
    },
  ],
  commits: [
    {
      commitId: "A",
      message: "Initial commit on main,Initial commit on main,Initial commit on main,Initial commit on main,Initial commit on main,Initial commit on main",
      firstParentId: null,
      secondParentId: null,
      branch: "main",
      depth: 0,
    },
    {
      commitId: "B",
      message: "Add feature B",
      firstParentId: "A",
      secondParentId: null,
      branch: "main",
      depth: 1,
    },
    {
      commitId: "C",
      message: "Update C",
      firstParentId: "B",
      secondParentId: null,
      branch: "main",
      depth: 2,
    },
    {
      commitId: "D",
      message: "Fix bug in D",
      firstParentId: "C",
      secondParentId: null,
      branch: "main",
      depth: 3,
    },
    {
      commitId: "E",
      message: "Main continues with E",
      firstParentId: null,
      secondParentId: "D",
      branch: "other",
      depth: 3,
    },
    {
      commitId: "F",
      message: "Add F",
      firstParentId: "E",
      secondParentId: null,
      branch: "other",
      depth: 4,
    },
    {
      commitId: "G",
      message: "Update G",
      firstParentId: "F",
      secondParentId: null,
      branch: "other",
      depth: 5,
    },
    {
      commitId: "H",
      message: "Finalize H",
      firstParentId: "G",
      secondParentId: null,
      branch: "other",
      depth: 6,
    },
    {
      commitId: "I",
      message: "Merge branch 'other' into main",
      branch: "main",
      firstParentId: "D",
      secondParentId: "H",
      depth: 7,
    },
  ],
};

function GitGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const { nodes, edges } = formatter(mockData);
    const graph = new Graph({
      container: containerRef.current!,
      data: {
        nodes,
        edges,
      },
      autoResize: true,
      autoFit: {
        type: "view",
        options: {
          when: "always",
          direction: "x",
        },
      },
      padding: 20,
      layout: {
        type: "git-graph-layout",
      },
      node: nodeOption,
      edge: edgeOption,
      behaviors: [{
        type: "scroll-canvas",
        key: "scroll-canvas",
        range: 0.5, // antv/g6 的滚动限制很有可能有问题, 暂时使用 0.5
        preventDefault: false,
        direction: "y",
      }],
      plugins: [tooltipOption],
    });
    graph.render();
    return () => {
      graph.destroy();
    };
  }, []);

  return (
    <div>
      <div>Use G6 in React</div>
      <div ref={containerRef} className="w-[400px] h-[800px] bg-white"></div>
    </div>
  );
}

export default GitGraph;
