import { useEffect, useState } from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Send, Link2, Flag, User, Share2, Trash2, X } from "lucide-react";
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
import { CommentSection } from "./CommentSection";
import { ShareModal } from "./ShareModal";
import { handleLike as handleLikeUtil, handleSave as handleSaveUtil } from "../utils/postInteractions";
import { Post } from "../utils/supabaseQueries";
import { useUserData } from "../App";
import { toast } from "sonner";

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
  onCommentToggle?: () => void;
  hideActions?: boolean;
  initialCommentsExpanded?: boolean;
  layout?: 'feed' | 'modal';
}

export function PostCard({ 
  post, 
  onDelete, 
  onCommentToggle, 
  hideActions = false, 
  initialCommentsExpanded = false,
  layout = 'feed'
}: PostCardProps) {
  const { onViewChange, userId: currentUserId, likedPostIds, savedPostIds, toggleLikedPost, toggleSavedPost, openLoginModal } = useUserData();
  const { postId, author, content, title, likes, comments: initialComments, created_at: timestamp, category, user_id } = post;

  const [likeCount, setLikeCount] = useState(likes || 0);
  const [showComments, setShowComments] = useState(initialCommentsExpanded);
  const [showShareModal, setShowShareModal] = useState(false);
  const [commentCount, setCommentCount] = useState(initialComments);

  const isLiked = likedPostIds.has(postId);
  const isSaved = savedPostIds.has(postId);

  const handleLike = async () => {
    if (!currentUserId) { openLoginModal(); return; }

    const prevLiked = isLiked;
    const prevLikeCount = likeCount;

    // Optimistic UI
    toggleLikedPost(postId, !prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevLikeCount - 1) : prevLikeCount + 1);

    try {
      const { newLikes, isLiked: serverIsLiked } = await handleLikeUtil(postId, prevLikeCount, currentUserId);
      toggleLikedPost(postId, serverIsLiked);
      setLikeCount(newLikes);
    } catch (error) {
      toggleLikedPost(postId, prevLiked);
      setLikeCount(prevLikeCount);
      console.error("Error handling like:", error);
    }
  };

  const handleSave = async () => {
    if (!currentUserId) { openLoginModal(); return; }

    const prevSaved = isSaved;
    toggleSavedPost(postId, !prevSaved);

    try {
      const serverIsSaved = await handleSaveUtil(postId, currentUserId);
      toggleSavedPost(postId, serverIsSaved);
    } catch (error) {
      toggleSavedPost(postId, prevSaved);
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
    const url = `${window.location.origin}?view=post&targetId=${postId}`;
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

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;

      toast.success("Post deleted successfully.");

      if (onDelete) {
        onDelete(postId);
      } else {
        // Fallback for components that don't yet pass onDelete
        window.location.reload();
      }
    } catch (e: any) {
      console.error("Error deleting post:", e);
      toast.error(e.message || "Failed to delete post.");
    }
  };

  return (
    <Card 
      id={`post-${postId}`} 
      className={onCommentToggle ? "p-6 md:p-8 border-none shadow-none" : "p-4 md:p-6"} 
      style={{ 
        background: onCommentToggle ? 'transparent' : 'var(--theme-card-bg)', 
        borderRadius: onCommentToggle ? '0' : '24px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
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
          <DropdownMenuContent align="end" className="w-44" style={{ zIndex: 10000 }}>
            {user_id === currentUserId && (
              <>
                <DropdownMenuItem onClick={handleDeletePost} className="text-red-500 font-medium focus:text-red-500">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Post
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
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

      {title && (
        <h3 
          className="mb-4 text-2xl md:text-3xl font-extrabold tracking-tight" 
          style={{ color: "var(--theme-text)", lineHeight: "1.2" }}
        >
          {title}
        </h3>
      )}

      <div className={onCommentToggle ? "mb-6 whitespace-pre-line italic opacity-90 text-[16px] md:text-lg leading-relaxed" : "mb-4 whitespace-pre-line italic opacity-80"}>
        {content}
      </div>

      <div className="flex items-center gap-6 pt-4 border-t">
        <button onClick={handleLike} className="flex items-center gap-2">
          <Heart
            className="w-5 h-5"
            fill={isLiked ? "var(--theme-primary)" : "none"}
            color={isLiked ? "var(--theme-primary)" : "currentColor"}
          />
          <span>{likeCount}</span>
        </button>

        <button 
          onClick={() => {
            if (onCommentToggle) onCommentToggle();
            else setShowComments(!showComments);
          }} 
          className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{commentCount}</span>
        </button>

        {!hideActions && (
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        )}

        <button onClick={handleSave} className="ml-auto">
          <Bookmark
            className="w-5 h-5"
            fill={isSaved ? "var(--theme-primary)" : "none"}
            color={isSaved ? "var(--theme-primary)" : "currentColor"}
          />
        </button>
      </div>

      {/* Inline/Integrated Comments Extension */}
      {showComments && (
        <div className={`mt-4 ${layout === 'modal' ? 'lg:mt-0 lg:border-l lg:border-t-0' : 'border-t'}`} style={{ borderColor: 'var(--theme-text)10', flex: layout === 'modal' ? '1.5' : 'none' }}>
          <div className={`py-4 ${layout === 'modal' ? 'lg:py-0 lg:h-full lg:flex lg:flex-col' : ''}`}>
            <div className="flex items-center justify-between px-4 py-2 border-b lg:border-none" style={{ borderColor: 'var(--theme-text)05' }}>
              <h4 className="text-sm font-bold opacity-60">Comments</h4>
              <button 
                onClick={() => {
                  if (layout === 'modal') onCommentToggle?.();
                  else setShowComments(false);
                }} 
                className="p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                <X size={16} className="opacity-40" />
              </button>
            </div>
            <div className={layout === 'modal' ? 'lg:flex-1 lg:overflow-hidden' : ''}>
              <CommentSection
                postId={postId}
                postAuthorId={user_id}
                onCommentAdded={handleCommentAdded}
                maxHeight={layout === 'modal' ? "none" : "500px"}
              />
            </div>
          </div>
        </div>
      )}

      <ShareModal
        postId={postId}
        postTitle={title}
        postContent={content}
        authorName={author?.full_name || "Anonymous"}
        authorAvatar={author?.avatar_url || ""}
        likes={likeCount}
        comments={commentCount}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onViewChange={onViewChange}
      />
    </Card>
  );
}
