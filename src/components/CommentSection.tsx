import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import { Heart, MoreVertical, Trash2, Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { handleComment } from "../utils/postInteractions";
import { useUserData } from "../App";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";

interface CommentSectionProps {
  postId: string;
  postAuthorId?: string;
  onCommentAdded: () => void;
  maxHeight?: string;
}

export function CommentSection({
  postId,
  postAuthorId,
  onCommentAdded,
  maxHeight = "60vh",
}: CommentSectionProps) {
  const { avatarUrl, username, userId: currentUserId, openLoginModal } = useUserData();
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentContent, setNewCommentContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
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

        let likedSet = new Set<string>();
        if (currentUserId && commentsData.length > 0) {
          const commentIds = commentsData.map((c) => c.id);
          const { data: likesData } = await supabase
            .from("comment_likes")
            .select("comment_id")
            .eq("user_id", currentUserId)
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
    if (!currentUserId) { openLoginModal(); return; }

    setSubmitting(true);
    try {
      await handleComment(postId, currentUserId, trimmed);
      
      if (postAuthorId && postAuthorId !== currentUserId) {
        const { triggerPushNotification } = await import("../utils/pushNotifications");
        triggerPushNotification({
          userId: postAuthorId,
          title: "💭 New Comment",
          body: `${username || "Someone"} commented on your post`,
          url: `/?view=post&targetId=${postId}&comments=true`,
          type: "comments"
        });
      }

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
    if (!currentUserId) { openLoginModal(); return; }
    const isLiked = likedComments.has(commentId);

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
        await supabase.from("comment_likes").delete().eq("user_id", currentUserId).eq("comment_id", commentId);
        const { data: current } = await supabase.from("comments").select("likes").eq("id", commentId).single();
        await supabase.from("comments").update({ likes: Math.max(0, (current?.likes || 1) - 1) }).eq("id", commentId);
      } else {
        await supabase.from("comment_likes").insert({ user_id: currentUserId, comment_id: commentId });
        const { data: current } = await supabase.from("comments").select("likes").eq("id", commentId).single();
        await supabase.from("comments").update({ likes: (current?.likes || 0) + 1 }).eq("id", commentId);
      }
    } catch (err) {
      console.error("Error persisting comment like:", err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
    } catch (err: any) {
      console.error("Error deleting comment:", err);
      toast.error(err.message || "Failed to delete comment");
    }
  };

  const handleReportComment = (commentId: string) => {
    const reports = JSON.parse(localStorage.getItem("smileArtist_comment_reports") || "[]");
    reports.push({ commentId, reportedBy: currentUserId, reportedAt: new Date().toISOString() });
    localStorage.setItem("smileArtist_comment_reports", JSON.stringify(reports));
    toast.success("Comment reported. Thank you.");
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

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ minHeight: 0 }}>
      {/* Comments List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-5"
        style={{ minHeight: 0, maxHeight }}
      >
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--theme-primary)", borderTopColor: "transparent" }} />
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-2 text-center">
            <p className="text-sm font-bold" style={{ color: "var(--theme-text)" }}>No comments yet.</p>
            <p className="text-sm" style={{ color: "var(--theme-text)", opacity: 0.5 }}>Be the first to share your thoughts.</p>
          </div>
        )}

        {comments.map((comment: any) => {
          const isLiked = likedComments.has(comment.id);
          const displayName = comment.profile?.username || comment.profile?.full_name || "user";
          const fullName = comment.profile?.full_name || displayName;

          return (
            <div key={comment.id} className="flex items-start gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={comment.profile?.avatar_url || ""} />
                <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: "var(--theme-accent)", color: "var(--theme-primary)" }}>
                  {(fullName)[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug" style={{ color: "var(--theme-text)" }}>
                  <span className="font-semibold mr-1">{displayName}</span>
                  {comment.content}
                </p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs" style={{ color: "var(--theme-text)", opacity: 0.45 }}>{formatTime(comment.created_at)}</span>
                  {(comment.likes || 0) > 0 && (
                    <span className="text-xs font-semibold" style={{ color: "var(--theme-text)", opacity: 0.55 }}>
                      {comment.likes} {comment.likes === 1 ? "like" : "likes"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => toggleCommentLike(comment.id)} className="flex-shrink-0 p-1">
                  <Heart className="w-3.5 h-3.5" fill={isLiked ? "var(--theme-primary)" : "none"} color={isLiked ? "var(--theme-primary)" : "var(--theme-text)"} style={{ opacity: isLiked ? 1 : 0.4 }} />
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex-shrink-0 p-1 opacity-40 hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-3.5 h-3.5" style={{ color: "var(--theme-text)" }} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40" style={{ zIndex: 10010 }}>
                    {(currentUserId === comment.user_id || currentUserId === postAuthorId) && (
                      <DropdownMenuItem onClick={() => handleDeleteComment(comment.id)} className="text-red-500 font-medium font-bold">
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleReportComment(comment.id)}>
                      <Flag className="w-3.5 h-3.5 mr-2" />
                      Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div
        className="border-t px-4 py-3 flex items-center gap-3"
        style={{
          borderColor: "var(--theme-text)10",
          backgroundColor: "var(--theme-card-bg)",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          backdropFilter: 'blur(10px)'
        }}
      >
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={avatarUrl || ""} />
          <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: "var(--theme-accent)", color: "var(--theme-primary)" }}>
            {username?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 flex items-center rounded-3xl px-4 py-2" style={{ backgroundColor: "var(--theme-accent)", border: `1px solid var(--theme-text)10` }}>
          <input
            ref={inputRef}
            type="text"
            placeholder={`Comment as ${username || "you"}...`}
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
            className="flex-1 bg-transparent outline-none text-sm min-w-0"
            style={{ color: "var(--theme-text)" }}
            disabled={submitting}
          />
        </div>

        {newCommentContent.trim() && (
          <button onClick={handleSubmitComment} disabled={submitting} className="flex-shrink-0 text-sm font-bold" style={{ color: "var(--theme-primary)" }}>
            {submitting ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "var(--theme-primary)", borderTopColor: "transparent" }} /> : "Post"}
          </button>
        )}
      </div>
    </div>
  );
}
