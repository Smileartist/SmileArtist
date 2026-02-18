import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../utils/supabaseClient";
import { X, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { handleComment } from "../utils/postInteractions";
import { useUserData } from "../App";

interface CommentModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
}

export function CommentModal({ postId, isOpen, onClose, onCommentAdded }: CommentModalProps) {
  const { avatarUrl, username } = useUserData();
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentContent, setNewCommentContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [leftOffset, setLeftOffset] = useState(0);
  const [bottomOffset, setBottomOffset] = useState(0);

  useEffect(() => {
    const update = () => {
      const isDesktop = window.innerWidth >= 768;
      setLeftOffset(isDesktop ? 256 : 0);
      setBottomOffset(isDesktop ? 0 : 64);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setNewCommentContent("");
    }
  }, [isOpen, postId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const currentUid = user?.id || null;
      setCurrentUserId(currentUid);

      const { data: commentsData, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id, likes")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const userIds = Array.from(new Set(commentsData.map((c) => c.user_id)));
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username")
          .in("id", userIds);

        // Fetch which comments the current user has already liked
        let likedSet = new Set<string>();
        if (currentUid && commentsData.length > 0) {
          const commentIds = commentsData.map((c) => c.id);
          const { data: likesData } = await supabase
            .from("comment_likes")
            .select("comment_id")
            .eq("user_id", currentUid)
            .in("comment_id", commentIds);
          likedSet = new Set((likesData || []).map((l: any) => l.comment_id));
        }
        setLikedComments(likedSet);

        setComments(
          commentsData.map((c) => ({
            ...c,
            profile: profilesData?.find((p) => p.id === c.user_id),
            likes: c.likes || 0,
          }))
        );
      } else {
        setComments([]);
        setLikedComments(new Set());
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    const trimmed = newCommentContent.trim();
    if (!trimmed || submitting) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Login required"); return; }

    setSubmitting(true);
    try {
      await handleComment(postId, user.id, trimmed);
      setNewCommentContent("");
      await fetchComments();
      onCommentAdded();
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!currentUserId) return;

    const isLiked = likedComments.has(commentId);

    // Optimistic UI update first
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(commentId); else next.add(commentId);
      return next;
    });
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, likes: Math.max(0, (c.likes || 0) + (isLiked ? -1 : 1)) }
          : c
      )
    );

    try {
      if (isLiked) {
        // Remove like from comment_likes
        await supabase
          .from("comment_likes")
          .delete()
          .eq("user_id", currentUserId)
          .eq("comment_id", commentId);

        // Decrement likes counter on the comment row
        const { data: current } = await supabase
          .from("comments")
          .select("likes")
          .eq("id", commentId)
          .single();
        await supabase
          .from("comments")
          .update({ likes: Math.max(0, (current?.likes || 1) - 1) })
          .eq("id", commentId);
      } else {
        // Insert like
        await supabase
          .from("comment_likes")
          .insert({ user_id: currentUserId, comment_id: commentId });

        // Increment likes counter on the comment row
        const { data: current } = await supabase
          .from("comments")
          .select("likes")
          .eq("id", commentId)
          .single();
        await supabase
          .from("comments")
          .update({ likes: (current?.likes || 0) + 1 })
          .eq("id", commentId);
      }
    } catch (err) {
      console.error("Error persisting comment like:", err);
      // Revert optimistic update on error
      setLikedComments((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(commentId); else next.delete(commentId);
        return next;
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, likes: Math.max(0, (c.likes || 0) + (isLiked ? 1 : -1)) }
            : c
        )
      );
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed z-[101] right-0 flex items-end justify-center"
        style={{ left: leftOffset, bottom: bottomOffset }}
        onClick={onClose}
      >
        <div
          className="w-full flex flex-col"
          style={{
            maxWidth: leftOffset > 0 ? "520px" : "100%",
            backgroundColor: "var(--theme-background)",
            backgroundImage: "none",
            opacity: 1,
            borderRadius: "16px 16px 0 0",
            maxHeight: "85vh",
            boxShadow: "0 -4px 30px rgba(0,0,0,0.25)",
            isolation: "isolate",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div
              className="w-9 h-1 rounded-full"
              style={{ backgroundColor: "var(--theme-text)", opacity: 0.2 }}
            />
          </div>

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--theme-text)15" }}
          >
            <div className="w-8" />
            <p
              className="text-sm font-bold tracking-wide"
              style={{ color: "var(--theme-text)" }}
            >
              Comments
            </p>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--theme-accent)" }}
            >
              <X className="w-4 h-4" style={{ color: "var(--theme-text)" }} />
            </button>
          </div>

          {/* Comments List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-5"
            style={{ minHeight: 0 }}
          >
            {loading && (
              <div className="flex justify-center py-10">
                <div
                  className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{
                    borderColor: "var(--theme-primary)",
                    borderTopColor: "transparent",
                  }}
                />
              </div>
            )}

            {!loading && comments.length === 0 && (
              <div className="flex flex-col items-center py-12 gap-2">
                <p className="text-sm font-bold" style={{ color: "var(--theme-text)" }}>
                  No comments yet.
                </p>
                <p className="text-sm" style={{ color: "var(--theme-text)", opacity: 0.5 }}>
                  Start the conversation.
                </p>
              </div>
            )}

            {comments.map((comment: any) => {
              const isLiked = likedComments.has(comment.id);
              const displayName = comment.profile?.username || comment.profile?.full_name || "user";
              const fullName = comment.profile?.full_name || displayName;

              return (
                <div key={comment.id} className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={comment.profile?.avatar_url || ""} alt={fullName} />
                    <AvatarFallback
                      className="text-xs font-bold"
                      style={{
                        backgroundColor: "var(--theme-accent)",
                        color: "var(--theme-primary)",
                      }}
                    >
                      {(fullName)[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug" style={{ color: "var(--theme-text)" }}>
                      <span className="font-semibold mr-1">{displayName}</span>
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs" style={{ color: "var(--theme-text)", opacity: 0.45 }}>
                        {formatTime(comment.created_at)}
                      </span>
                      {(comment.likes || 0) > 0 && (
                        <span className="text-xs font-semibold" style={{ color: "var(--theme-text)", opacity: 0.55 }}>
                          {comment.likes} {comment.likes === 1 ? "like" : "likes"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Like button */}
                  <button
                    onClick={() => toggleCommentLike(comment.id)}
                    className="flex-shrink-0 pt-0.5"
                    disabled={!currentUserId}
                  >
                    <Heart
                      className="w-3.5 h-3.5"
                      fill={isLiked ? "var(--theme-primary)" : "none"}
                      color={isLiked ? "var(--theme-primary)" : "var(--theme-text)"}
                      style={{ opacity: isLiked ? 1 : 0.4 }}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Input Area */}
          <div
            className="border-t px-4 py-3 flex items-center gap-3"
            style={{
              borderColor: "var(--theme-text)15",
              backgroundColor: "var(--theme-background)",
              backgroundImage: "none",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
            }}
          >
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={avatarUrl || ""} alt={username} />
              <AvatarFallback
                className="text-xs font-bold"
                style={{
                  backgroundColor: "var(--theme-accent)",
                  color: "var(--theme-primary)",
                }}
              >
                {username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div
              className="flex-1 flex items-center rounded-3xl px-4 py-2"
              style={{
                backgroundColor: "var(--theme-accent)",
                border: `1px solid var(--theme-text)10`,
              }}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder={`Add a comment as ${username || "you"}...`}
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
                className="flex-1 bg-transparent outline-none text-sm min-w-0"
                style={{ color: "var(--theme-text)" }}
                disabled={submitting}
              />
            </div>

            {newCommentContent.trim() && (
              <button
                onClick={handleSubmitComment}
                disabled={submitting}
                className="flex-shrink-0 text-sm font-bold"
                style={{ color: "var(--theme-primary)" }}
              >
                {submitting ? (
                  <div
                    className="w-4 h-4 rounded-full border-2 animate-spin"
                    style={{ borderColor: "var(--theme-primary)", borderTopColor: "transparent" }}
                  />
                ) : (
                  "Post"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
