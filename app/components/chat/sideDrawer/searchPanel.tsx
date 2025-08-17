import { RoomContext } from "@/components/chat/roomContext";
import SearchedMessage from "@/components/chat/smallComponents/searchedMessage";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { SearchFilled } from "@/icons";
import { useDebounce } from "ahooks";
import { use, useMemo, useState } from "react";

export default function SearchPanel() {
  const roomContext = use(RoomContext);
  const historyMessages = useMemo(() => roomContext.chatHistory?.messages ?? [], [roomContext.chatHistory?.messages]);

  const [_, setSideDrawerState] = useSearchParamsState<"none" | "user" | "role" | "search" | "initiative" | "map">("rightSideDrawer", "none");

  const [searchText, setSearchText] = useState<string>("");
  const debouncedSearchText = useDebounce<string>(searchText, { wait: 500 });
  const searchResult = useMemo(() => {
    if (!debouncedSearchText || debouncedSearchText.length === 0)
      return [];
    return historyMessages.filter(message =>
      message.message.content.includes(debouncedSearchText));
  }, [historyMessages, debouncedSearchText]);

  return (
    <div className="w-full h-full flex flex-col bg-base-200 p-4 gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-base-content">搜索聊天记录</h2>
        <input
          type="text"
          placeholder="输入关键词搜索..."
          className="input input-bordered w-full"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        {debouncedSearchText && (
          <div className="text-sm text-base-content/70">
            找到
            {" "}
            {searchResult.length}
            {" "}
            条相关记录
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {searchResult.length > 0
          ? (
              searchResult.map(message => (
                <SearchedMessage
                  message={message}
                  keyword={debouncedSearchText}
                  key={message.message.messageID}
                  onClick={() => {
                    roomContext.scrollToGivenMessage && roomContext.scrollToGivenMessage(message.message.messageID);
                    setSideDrawerState("none");
                  }}
                >
                </SearchedMessage>
              ))
            )
          : debouncedSearchText
            ? (
                <div className="flex flex-col items-center justify-center h-full text-base-content/50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2">没有找到匹配的聊天记录</p>
                </div>
              )
            : (
                <div className="flex flex-col items-center justify-center h-full text-base-content/50">
                  <SearchFilled className="size-12"></SearchFilled>
                  <p className="mt-2">输入关键词搜索聊天记录</p>
                </div>
              )}
      </div>
    </div>
  );
}
