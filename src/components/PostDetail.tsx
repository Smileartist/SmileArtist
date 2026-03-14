import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PostCard } from "./PostCard";
import { supabase } from "../utils/supabaseClient";
import { useUserData } from "../App";

interface PostDetailProps {
  postId: string;
  onViewChange: (view: string, targetId?: string | null) => void;
}

export function PostDetail({ postId, onViewChange }: PostDetailProps) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { userId } = useUserData();

  useEffect(() => {
    const fetchPost = async () => {
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
        const name = authorProfile?.full_name || "Anonymous";

        setPost({
          postId: data.id,
          title: data.title,
          content: data.content,
          likes: data.likes || 0,
          comments: data.comments || 0,
          created_at: new Date(data.created_at).toLocaleDateString(),
          category: "General",
          user_id: data.user_id,
          author: {
            full_name: name,
            username: authorProfile?.username || "user",
            avatar_url: authorProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
          },
        });
      } catch (err) {
        console.error("Error fetching post detail:", err);
      } finally {
        setLoading(false);
      }
    };

    if (postId) fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="animate-pulse">Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <button 
          onClick={() => onViewChange("home")}
          className="flex items-center gap-2 mb-6 opacity-60 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" /> Go back
        </button>
        <p>Post not found or has been deleted.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 md:py-8">
      <button 
        onClick={() => onViewChange("home")}
        className="flex items-center gap-2 mb-6 opacity-60 hover:opacity-100 transition-opacity"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Feed
      </button>

      <PostCard 
        {...post} 
        currentUserId={userId} 
        onViewChange={onViewChange}
      />
      
      {/* If there was a comment section or more details, they would go here */}
    </div>
  );
}
