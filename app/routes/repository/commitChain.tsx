import RepositoryCommitChainPage from "@/components/repository/commitChain/RepositoryCommitChainPage";

export function meta() {
  return [
    { title: "仓库 Commit 链" },
    { name: "description", content: "查看仓库提交链路" },
  ];
}

export default function RepositoryCommitChainRoute() {
  return <RepositoryCommitChainPage />;
}
