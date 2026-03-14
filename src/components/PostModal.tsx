import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { PostCard } from "./PostCard";
import { supabase } from "../utils/supabaseClient";
import { Post } from "../utils/supabaseQueries";

interface PostModalProps {
  postId: string | null;
  onClose: () => void;
}

export function PostModal({ postId, onClose }: PostModalProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("posts")
          .select(`
            id,
            title,
            content,
            likes,
            comments,
            created_at,
            category,
            user_id,
            author:user_id (
              full_name,
              username,
              avatar_url
            )
          `)
          .eq("id", postId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setPost(null);
          return;
        }

        const authorProfile = Array.isArray(data.author) ? data.author[0] : data.author;

        setPost({
          postId: data.id,
          title: data.title || "Untitled",
          content: data.content || "",
          user_id: data.user_id,
          created_at: data.created_at,
          likes: data.likes || 0,
          comments: data.comments || 0,
          category: data.category || "General",
          author: {
            full_name: authorProfile?.full_name || "Anonymous",
            username: authorProfile?.username || "user",
            avatar_url: authorProfile?.avatar_url || "",
          },
        });
      } catch (err) {
        console.error("Error fetching post for modal:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (!postId) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          backgroundColor: 'var(--theme-card-bg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '12px', zIndex: 10,
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', border: 'none', cursor: 'pointer',
            backgroundColor: 'var(--theme-accent)', color: 'var(--theme-primary)',
          }}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div style={{ padding: '8px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text)', opacity: 0.6 }}>
              <div className="animate-pulse">Loading post details...</div>
            </div>
          ) : post ? (
            <PostCard post={post} />
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text)', opacity: 0.6 }}>
              Post not found.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
