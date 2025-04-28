import type { LikeRecordRequest } from "../../../api";
import { useIsLikedQuery, useLikeMutation, useUnlikeMutation } from "../../../api/hooks/likeQueryHooks";

export default function LikeComponent({ targetInfo }: { targetInfo: LikeRecordRequest }) {
  const isLikedQuery = useIsLikedQuery(targetInfo);
  const isLiked = isLikedQuery.data?.data;
  const likeCount = 113;

  const likeMutation = useLikeMutation();
  const unlikeMutation = useUnlikeMutation();

  const toggleLike = () => {
    if (isLiked) {
      unlikeMutation.mutate(targetInfo);
    }
    else {
      likeMutation.mutate(targetInfo);
    }
  };

  return (
    <button onClick={toggleLike} className="flex flex-col items-center" type="button">
      <div className="relative w-10 h-10">
        <div className={`absolute inset-0 ${isLiked ? "text-red-500" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill={isLiked ? "currentColor" : "none"}
            />
          </svg>
        </div>
      </div>
      <span className="text-xs mt-1">{isLiked ? likeCount + 1 : likeCount}</span>
    </button>
  );
}
