import { CompassIcon, HomeIcon } from "@/icons";
import React from "react";
import { Link } from "react-router";

/**
 * 当URL非法的时候，显示的页面
 * @param info 错误信息
 */
export default function IllegalURLPage({ info }: { info: string }) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-base-100 rounded-2xl shadow-md p-8 text-center">
        <CompassIcon className="mx-auto h-16 w-16 text-primary" />
        <h2 className="text-2xl font-bold mt-4 mb-2">{info}</h2>
        <Link to="/" className="btn btn-primary gap-2">
          <HomeIcon className="w-5 h-5" />
          返回首页
        </Link>
      </div>
    </div>
  );
}
