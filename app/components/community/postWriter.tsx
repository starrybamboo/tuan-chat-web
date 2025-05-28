import { CommunityContext } from "@/components/community/communityContext";
import { use, useState } from "react";
import { usePublishPostMutation } from "../../../api/hooks/communityQueryHooks";

export default function PostWriter() {
  const communityContext = use(CommunityContext);
  const communityId = communityContext.communityId ?? -1;
  const publishPostMutation = usePublishPostMutation();
  const isPublishing = publishPostMutation.isPending;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim())
      return;

    publishPostMutation.mutate(
      {
        communityId,
        title: title.trim(),
        content: content.trim(),
      },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
        },
      },
    );
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title">Create New Post</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Title</span>
            </label>
            <input
              type="text"
              placeholder="Post title"
              className="input input-bordered w-full"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Content</span>
            </label>
            <textarea
              placeholder="What's on your mind?"
              className="textarea textarea-bordered w-full h-32"
              value={content}
              onChange={e => setContent(e.target.value)}
              required
            />
          </div>

          <div className="card-actions justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPublishing}
            >
              {isPublishing
                ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Publishing...
                    </>
                  )
                : (
                    "Publish Post"
                  )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
