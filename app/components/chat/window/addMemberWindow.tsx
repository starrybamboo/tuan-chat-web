import { UserDetail } from "@/components/common/userDetail";
import React, { useState } from "react";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

export default function AddMemberWindow({ handleAddMember }: { handleAddMember: (userId: number) => void }) {
  // 添加成员输入框内的输入
  const [inputUserId, setInputUserId] = useState<number>(-1);
  // 检验输入的Id是否有效
  const inputUserInfo = useGetUserInfoQuery(inputUserId).data?.data;
  return (
    <div className="w-full justify-center">
      <p className="text-lg font-bold text-center w-full mb-4 ">输入要加入的用户的ID</p>
      <input
        type="text"
        placeholder="输入要加入的成员的ID"
        className="input mb-8"
        onInput={e => setInputUserId(Number(e.currentTarget.value))}
      />
      {
        (inputUserId > 0 && inputUserInfo)
        && (
          <div className="w-full items-center flex flex-col gap-y-4">
            <UserDetail userId={inputUserId}></UserDetail>
            <button className="btn btn-info" type="button" onClick={() => handleAddMember(Number(inputUserId))}>
              确认
            </button>
          </div>
        )
      }
    </div>
  );
}
