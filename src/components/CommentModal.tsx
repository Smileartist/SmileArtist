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
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Track sidebar offset (desktop) and bottom offset (mobile nav bar)
  const [leftOffset, setLeftOffset] = useState(0);
  const [bottomOffset, setBottomOffset] = useState(0);

  useEffect(() => {
    const update = () => {
      const isDesktop = window.innerWidth >= 768;
      setLeftOffset(isDesktop ? 256 : 0);
      setBottomOffset(isDesktop ? 0 : 64); // mobile nav bar is h-16 = 64px
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      // Focus input after drawer opens
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setNewCommentContent("");
    }
  }, [isOpen, postId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data: commentsData, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const userIds = Array.from(new Set(commentsData.map((c) => c.user_id)));
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username")
          .in("id", userIds);

        setComments(
          commentsData.map((c) => ({
            ...c,
            profile: profilesData?.find((p) => p.id === c.user_id),
            localLikes: 0,
          }))
        );
      } else {
        setComments([]);
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
      // Scroll to bottom after new comment
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCommentLike = (commentId: string) => {
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, localLikes: likedComments.has(commentId) ? (c.localLikes || 0) - 1 : (c.localLikes || 0) + 1 }
          : c
      )
    );
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

  // Render via portal so `position:fixed` is always relative to the viewport,
  // never affected by a parent Card / transform stacking context.
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Bottom sheet — constrained to content area on desktop, above nav bar on mobile */}
      <div
        className="fixed z-[101] right-0 flex items-end justify-center"
        style={{ left: leftOffset, bottom: bottomOffset }}
        onClick={onClose}
      >
        {/* Sheet itself — stop propagation so clicking inside doesn't close */}
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
            isolation: "isolate",   /* creates a new stacking context, prevents transparency bleed */
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
          <div className="w-8" /> {/* spacer */}
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
                {/* Avatar */}
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

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: "var(--theme-text)" }}>
                    <span className="font-semibold mr-1">{displayName}</span>
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs" style={{ color: "var(--theme-text)", opacity: 0.45 }}>
                      {formatTime(comment.created_at)}
                    </span>
                    {(comment.localLikes || 0) > 0 && (
                      <span className="text-xs font-semibold" style={{ color: "var(--theme-text)", opacity: 0.55 }}>
                        {comment.localLikes} {comment.localLikes === 1 ? "like" : "likes"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Like button */}
                <button
                  onClick={() => toggleCommentLike(comment.id)}
                  className="flex-shrink-0 pt-0.5"
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

        {/* Input Area — Instagram style */}
        <div
          className="border-t px-4 py-3 flex items-center gap-3"
          style={{
            borderColor: "var(--theme-text)15",
            backgroundColor: "var(--theme-background)",
            backgroundImage: "none",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          }}
        >
          {/* Current user avatar */}
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

          {/* Input */}
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

          {/* Post button */}
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
