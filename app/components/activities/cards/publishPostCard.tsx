import { BarChartOutlineIcon, EmojiIconWhite, Image2Fill } from "@/icons";
import React, { useState } from "react";

export default function PublishBox() {
  const [content, setContent] = useState("");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-start space-x-4">
        <img
          src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&h=50&fit=crop&crop=face"
          alt="我的头像"
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="有什么新鲜事想告诉大家？"
            className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            rows={3}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex space-x-3">
              <button className="text-gray-500 hover:text-primary transition-colors" type="button">
                <EmojiIconWhite />
              </button>
              <button className="text-gray-500 hover:text-primary transition-colors" type="button">
                <Image2Fill />
              </button>
              <button className="text-gray-500 hover:text-primary transition-colors" type="button">
                <BarChartOutlineIcon />
              </button>
            </div>
            <button
              className={`px-6 py-2 rounded-full font-medium transition-colors ${
                content.trim()
                  ? "bg-primary text-white hover:bg-pink-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              disabled={!content.trim()}
              type="button"
            >
              发布
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
