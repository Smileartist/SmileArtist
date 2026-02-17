import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription, DrawerPortal, DrawerOverlay } from "./ui/drawer";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { handleComment } from "../utils/postInteractions";

interface CommentModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
}

export function CommentModal({ postId, isOpen, onClose, onCommentAdded }: CommentModalProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentContent, setNewCommentContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log("CommentModal detected isOpen true for postId:", postId);
      fetchComments();
    }
  }, [isOpen, postId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      if (commentsData && commentsData.length > 0) {
        const userIds = Array.from(new Set(commentsData.map(c => c.user_id)));

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        const mappedComments = commentsData.map(comment => ({
          ...comment,
          profiles: profilesData?.find(p => p.id === comment.user_id)
        }));
        setComments(mappedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to comment.");
      return;
    }

    if (!newCommentContent.trim()) {
      alert("Comment cannot be empty.");
      return;
    }

    setLoading(true);
    try {
      await handleComment(postId, user.id, newCommentContent);
      setNewCommentContent("");
      await fetchComments();
      onCommentAdded();
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open: boolean) => {
      console.log("Drawer onOpenChange fired with:", open);
      if (!open) onClose();
    }}>
      <DrawerPortal>
        <DrawerOverlay style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 100 }} />
        <DrawerContent className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-[10px] flex flex-col max-h-[80vh]">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-300 my-4" />
          <DrawerHeader>
            <DrawerTitle>Comments</DrawerTitle>
            <DrawerDescription>View and add comments to this post.</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {loading && <p>Loading comments...</p>}
            {!loading && comments.length === 0 && <p>No comments yet. Be the first to comment!</p>}
            {comments.map((comment: any) => (
              <div key={comment.id} className="flex items-start gap-3 mb-4">
                <img
                  src={comment.profiles?.avatar_url || "/placeholder-avatar.jpg"}
                  alt={comment.profiles?.full_name || "User"}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <p className="font-semibold">{comment.profiles?.full_name || comment.profiles?.username || "Anonymous"}</p>
                  <p className="text-sm text-gray-500">{comment.content}</p>
                  <p className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          <DrawerFooter className="p-4 border-t bg-white">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add a comment..."
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmitComment();
                  }
                }}
              />
              <Button onClick={handleSubmitComment} disabled={loading || !newCommentContent.trim()}>
                Post
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
