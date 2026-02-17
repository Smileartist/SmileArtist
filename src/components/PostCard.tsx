import { useEffect, useState } from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal } from "lucide-react";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { supabase } from "../utils/supabaseClient";
import { CommentModal } from "./CommentModal"; // Import the CommentModal
import { handleLike as handleLikeUtil, handleSave as handleSaveUtil } from "../utils/postInteractions";
import { Post } from "../utils/supabaseQueries"; // Import the Post interface

interface PostCardProps {
  post: Post; // Now accepts a single 'post' prop of type Post
}

export function PostCard({
  post
}: PostCardProps) {
  // Destructure post properties for easier use
  const { postId, author, content, title, likes, comments: initialComments, created_at: timestamp, category } = post;
  
  const [likeCount, setLikeCount] = useState(likes);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false); // State for comment modal visibility
  const [commentCount, setCommentCount] = useState(initialComments);

  // 🔥 check existing like/save on mount
  useEffect(() => {
    const checkState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: likeRow } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (likeRow) setLiked(true);

      const { data: saveRow } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (saveRow) setSaved(true);
    };

    checkState();
  }, [postId]);

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Login required");

    // Optimistic update
    const prevLiked = liked;
    const prevLikeCount = likeCount;

    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevLikeCount - 1) : prevLikeCount + 1);

    try {
      const { newLikes, isLiked } = await handleLikeUtil(postId, prevLikeCount, user.id);
      setLikeCount(newLikes);
      setLiked(isLiked);
    } catch (error) {
      // Revert on error
      setLiked(prevLiked);
      setLikeCount(prevLikeCount);
      console.error("Error handling like from PostCard:", error);
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Login required");

    // Optimistic update
    const prevSaved = saved;
    setSaved(!prevSaved);

    try {
      const isSaved = await handleSaveUtil(postId, user.id);
      setSaved(isSaved);
    } catch (error) {
      // Revert on error
      setSaved(prevSaved);
      console.error("Error handling save from PostCard desarialise:", error);
    }
  };

  const handleCommentClick = () => {
    console.log("Comment button clicked for post:", postId);
    setShowCommentModal(true);
    console.log("showCommentModal set to:", true);
  };

  const handleCommentModalClose = () => {
    console.log("Closing comment modal for post:", postId);
    setShowCommentModal(false);
    console.log("showCommentModal set to:", false);
  };

  const handleCommentAdded = () => {
    setCommentCount((prevCount: number) => prevCount + 1); // Increment comment count when a new comment is added
    console.log("Comment added, new count desarialise:", commentCount + 1);
  };

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={author?.avatar_url} />
            <AvatarFallback>{author?.full_name ? author.full_name[0] : "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p>{author?.full_name || "Anonymous"}</p>
            <p className="text-sm opacity-60">
              @{author?.username || "user"} · {timestamp}
            </p>
          </div>
        </div>

        <Button variant="ghost" size="icon">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {title && <h3 className="mb-3">{title}</h3>}

      <div className="mb-4 whitespace-pre-line italic opacity-80">
        {content}
      </div>

      <div className="flex items-center gap-6 pt-4 border-t">
        <button onClick={handleLike} className="flex items-center gap-2">
          <Heart
            className="w-5 h-5"
            fill={liked ? "var(--theme-primary)" : "none"}
            color={liked ? "var(--theme-primary)" : "currentColor"}
          />
          <span>{likeCount}</span>
        </button>

        <button onClick={handleCommentClick} className="flex items-center gap-2 opacity-70"> {/* Added onClick handler */}
          <MessageCircle className="w-5 h-5" />
          <span>{commentCount}</span>
        </button>

        <button onClick={handleSave} className="ml-auto">
          <Bookmark
            className="w-5 h-5"
            fill={saved ? "var(--theme-primary)" : "none"}
            color={saved ? "var(--theme-primary)" : "currentColor"}
          />
        </button>
      </div>

      {/* Comment Modal */}
      <CommentModal
        postId={postId}
        isOpen={showCommentModal}
        onClose={handleCommentModalClose}
        onCommentAdded={handleCommentAdded}
      />
    </Card>
  );
}
