import { useEffect, useState } from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Send, Link2, Flag, User, Share2 } from "lucide-react";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { supabase } from "../utils/supabaseClient";
import { CommentModal } from "./CommentModal";
import { ShareModal } from "./ShareModal";
import { handleLike as handleLikeUtil, handleSave as handleSaveUtil } from "../utils/postInteractions";
import { Post } from "../utils/supabaseQueries";
import { useUserData } from "../App";
import { toast } from "sonner";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { onViewChange, userId: currentUserId } = useUserData();
  const { postId, author, content, title, likes, comments: initialComments, created_at: timestamp, category } = post;

  // 🔥 FIX: do NOT trust posts.likes anymore
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [commentCount, setCommentCount] = useState(initialComments);

  useEffect(() => {
    const checkState = async () => {
      if (!currentUserId) {
        setLiked(false);
        return;
      }

      // ✅ Always fetch real like count from post_likes
      const { count } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      setLikeCount(count || 0);

      const { data: likeRow } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      setLiked(!!likeRow);

      const { data: saveRow } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (saveRow) setSaved(true);
    };

    checkState();

  }, [postId, currentUserId]);

  const handleLike = async () => {
    if (!currentUserId) return alert("Login required");

    const prevLiked = liked || false;
    const prevLikeCount = likeCount;

    // Optimistic UI
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevLikeCount - 1) : prevLikeCount + 1);

    try {
      const { newLikes, isLiked } = await handleLikeUtil(postId, prevLikeCount, currentUserId);

      setLiked(isLiked);
      setLikeCount(newLikes);

      // Safety: re-fetch true count to avoid drift
      const { count } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      setLikeCount(count || 0);

    } catch (error) {
      setLiked(prevLiked);
      setLikeCount(prevLikeCount);
      console.error("Error handling like:", error);
    }
  };

  const handleSave = async () => {
    if (!currentUserId) return alert("Login required");

    const prevSaved = saved;
    setSaved(!prevSaved);

    try {
      const isSaved = await handleSaveUtil(postId, currentUserId);
      setSaved(isSaved);
    } catch (error) {
      setSaved(prevSaved);
      console.error("Error handling save:", error);
    }
  };

  const handleCommentAdded = () => {
    setCommentCount((prev: number) => prev + 1);
  };

  const handleAuthorClick = () => {
    if (post.user_id) {
      onViewChange("profile", post.user_id);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?post=${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard!");
    });
  };

  const handleShareProfile = () => {
    const url = `${window.location.origin}?profile=${post.user_id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Profile link copied to clipboard!");
    });
  };

  const handleReport = () => {
    const reports = JSON.parse(localStorage.getItem("smileArtist_reports") || "[]");
    reports.push({
      postId,
      reportedBy: currentUserId,
      reportedAt: new Date().toISOString(),
    });
    localStorage.setItem("smileArtist_reports", JSON.stringify(reports));
    toast.success("Post reported. Thank you for keeping the community safe. 🙏");
  };

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <button
          onClick={handleAuthorClick}
          className="flex items-center gap-3 text-left hover:opacity-75 transition-opacity"
        >
          <Avatar>
            <AvatarImage src={author?.avatar_url} />
            <AvatarFallback>{author?.full_name ? author.full_name[0] : "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold hover:underline" style={{ color: "var(--theme-text)" }}>
              {author?.full_name || "Anonymous"}
            </p>
            <p className="text-sm opacity-60" style={{ color: "var(--theme-text)" }}>
              @{author?.username || "user"} · {timestamp}
            </p>
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-md hover:bg-[var(--theme-accent)] transition-colors"
              style={{ color: "var(--theme-text)" }}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleAuthorClick}>
              <User className="w-4 h-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyLink}>
              <Link2 className="w-4 h-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareProfile}>
              <Share2 className="w-4 h-4 mr-2" />
              Share Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleReport} className="text-red-500">
              <Flag className="w-4 h-4 mr-2" />
              Report Post
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {title && <h3 className="mb-3">{title}</h3>}

      <div className="mb-4 whitespace-pre-line italic opacity-80">
        {content}
      </div>

      <div className="flex items-center gap-6 pt-4 border-t">
        <button onClick={handleLike} className="flex items-center gap-2">
          <Heart
            className="w-5 h-5"
            fill={liked === true ? "var(--theme-primary)" : "none"}
            color={liked === true ? "var(--theme-primary)" : "currentColor"}
          />
          <span>{likeCount}</span>
        </button>

        <button onClick={() => setShowCommentModal(true)} className="flex items-center gap-2 opacity-70">
          <MessageCircle className="w-5 h-5" />
          <span>{commentCount}</span>
        </button>

        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
        >
          <Send className="w-5 h-5" />
        </button>

        <button onClick={handleSave} className="ml-auto">
          <Bookmark
            className="w-5 h-5"
            fill={saved ? "var(--theme-primary)" : "none"}
            color={saved ? "var(--theme-primary)" : "currentColor"}
          />
        </button>
      </div>

      <CommentModal
        postId={postId}
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onCommentAdded={handleCommentAdded}
      />

      <ShareModal
        postId={postId}
        postTitle={title}
        postContent={content}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onViewChange={onViewChange}
      />
    </Card>
  );
}
