import React from "react";

interface HomeTabProps {
  userId: number;
}

export const ActivitiesTab: React.FC<HomeTabProps> = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">动态</h2>
      <p>
        回复111抽奖
      </p>
    </div>
  );
};

export default ActivitiesTab;
