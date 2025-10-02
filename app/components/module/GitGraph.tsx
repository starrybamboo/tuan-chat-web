import Tree from "react-d3-tree";

interface GitNode {
  name: string;
  attributes: {
    id: string;
    type?: "commit" | "merge" | "branch";
    branch?: string;
    message?: string;
    date?: string;
    author?: string;
  };
  children?: GitNode[];
}

// Mock data in format compatible with react-d3-tree
const mockGitNodeData: GitNode = {
  name: "Initial commit",
  attributes: {
    id: "c1",
    branch: "main",
    type: "commit",
    message: "Project initialization",
    date: "2023-01-01",
    author: "dev1",
  },
  children: [
    {
      name: "Add auth",
      attributes: {
        id: "c2",
        branch: "main",
        type: "commit",
        message: "Add authentication",
        date: "2023-01-02",
        author: "dev1",
      },
      children: [
        {
          name: "Login form",
          attributes: {
            id: "c3",
            branch: "feature/login",
            type: "branch",
            message: "Create login UI",
            date: "2023-01-03",
            author: "dev2",
          },
          children: [
            {
              name: "Fix validation",
              attributes: {
                id: "c4",
                branch: "feature/login",
                type: "commit",
                message: "Fix form validation",
                date: "2023-01-04",
                author: "dev2",
              },
              children: [
                {
                  name: "Merge login",
                  attributes: {
                    id: "c5",
                    branch: "main",
                    type: "merge",
                    message: "Merge feature/login",
                    date: "2023-01-05",
                    author: "dev1",
                  },
                },
              ],
            },
          ],
        },
        {
          name: "JWT impl",
          attributes: {
            id: "c6",
            branch: "feature/auth",
            type: "branch",
            message: "Implement JWT",
            date: "2023-01-03",
            author: "dev3",
          },
          children: [
            {
              name: "Refresh tokens",
              attributes: {
                id: "c7",
                branch: "feature/auth",
                type: "commit",
                message: "Add token refresh",
                date: "2023-01-04",
                author: "dev3",
              },
              children: [
                {
                  name: "Merge auth",
                  attributes: {
                    id: "c8",
                    branch: "main",
                    type: "merge",
                    message: "Merge feature/auth",
                    date: "2023-01-06",
                    author: "dev1",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Add dashboard",
      attributes: {
        id: "c9",
        branch: "main",
        type: "commit",
        message: "Initialize dashboard",
        date: "2023-01-07",
        author: "dev1",
      },
      children: [
        {
          name: "Charts",
          attributes: {
            id: "c10",
            branch: "feature/dashboard",
            type: "branch",
            message: "Add chart components",
            date: "2023-01-08",
            author: "dev4",
          },
        },
      ],
    },
  ],
};

function GitGraph({ data = mockGitNodeData }: { data?: GitNode }) {
  return (
    <div id="treeWrapper" className="h-full items-center justify-center flex flex-1">
      <Tree data={data} />
    </div>
  );
}

export default GitGraph;
