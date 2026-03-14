import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { PostCard } from "./PostCard";
import { supabase } from "../utils/supabaseClient";
import { Post } from "../utils/supabaseQueries";
import { CommentSection } from "./CommentModal";

interface PostModalProps {
  postId: string | null;
  initialShowComments?: boolean;
  onClose: () => void;
}

export function PostModal({ postId, initialShowComments = false, onClose }: PostModalProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Body/HTML scroll lock
  useEffect(() => {
    if (postId) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [postId]);

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

    if (postId) {
      fetchPost();
      setShowComments(initialShowComments);
    }
  }, [postId]);

  useEffect(() => {
    if (showComments && !isDesktop && scrollContainerRef.current) {
      setTimeout(() => {
        // Find the newly rendered comments division inside the postcard and scroll to it if needed
        const commentsEl = scrollContainerRef.current?.querySelector('.mt-4.border-t');
        commentsEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [showComments, isDesktop]);

  if (!postId) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isDesktop ? '24px' : '16px', // Added 16px padding on mobile to prevent overflow
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      {/* Main Close button on overlay */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 10200,
          width: '40px', height: '40px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%', 
          cursor: 'pointer',
          backgroundColor: 'rgba(255,255,255,0.1)', 
          color: 'white',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
        aria-label="Close Modal"
      >
        <X size={20} />
      </button>

      <div
        ref={scrollContainerRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: showComments && isDesktop ? '1000px' : '560px',
          maxHeight: isDesktop ? '92vh' : '85vh',
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          backgroundColor: 'var(--theme-card-bg)',
          transition: 'max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          width: '100%'
        }}>
          <div style={{ padding: '0' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--theme-text)', opacity: 0.6 }}>
                <div className="animate-pulse">Loading post details...</div>
              </div>
            ) : post ? (
              <PostCard 
                post={post} 
                initialCommentsExpanded={showComments}
                onCommentToggle={() => setShowComments(!showComments)}
                layout={isDesktop && showComments ? 'modal' : 'feed'}
              />
            ) : (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--theme-text)', opacity: 0.6 }}>
                Post not found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
