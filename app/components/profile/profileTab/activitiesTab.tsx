import React from "react";

interface ActivitiesTabProps {
  userId: number;
}

export const ActivitiesTab: React.FC<ActivitiesTabProps> = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto mb-20">
      <h2 className="text-xl font-bold">动态</h2>
    </div>
  );
};

export default ActivitiesTab;
