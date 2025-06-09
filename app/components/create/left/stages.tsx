enum _StageStatus {
  ADD = "add",
  MOD = "modify",
  DEL = "delete",
}

// function StageItems({ avatarId, label, status }: {
//   avatarId: number;
//   label: string;
//   status: StageStatus;
// }) {

// }

function Stages() {
  return (
    <div className="w-full h-full flex flex-col gap-2">
      暂存区
    </div>
  );
}

export default Stages;
