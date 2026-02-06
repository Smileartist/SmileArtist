import { useEffect, useState } from "react";
import { PostCard } from "./PostCard";
import { supabase } from "../utils/supabaseClient";
import { BookOpen } from "lucide-react";

export function HomePage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select(`
            *,
            profiles:user_id (
              full_name,
              username,
              avatar_url
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
  const formattedPosts = data.map(post => {
    const profile = post.profiles as any;
    const avatar = profile?.avatar_url || post.author_avatar;
    const name = profile?.full_name || post.author_name || "Anonymous";
    return {
      author: {
        name,
        username: profile?.username || post.author_name?.toLowerCase().replace(/\s/g, '') || "user",
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      },
              title: post.title,
              content: post.content,
              likes: post.likes || 0,
              comments: post.comments || 0,
              timestamp: new Date(post.created_at).toLocaleDateString(),
              category: post.categories?.[0] || "General",
            };
          });
          setPosts(formattedPosts);
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p style={{ color: "var(--theme-text)", opacity: 0.6 }}>Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 md:space-y-6">
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <PostCard key={index} {...post} />
          ))
        ) : (
          <div className="text-center py-20 bg-[var(--theme-card-bg)]/50 rounded-3xl border-2 border-dashed border-[var(--theme-primary)]/20">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: "var(--theme-primary)" }} />
            <h2 className="text-xl font-medium mb-2" style={{ color: "var(--theme-text)" }}>No posts yet</h2>
            <p className="opacity-60" style={{ color: "var(--theme-text)" }}>Be the first to share your heart with the world!</p>
          </div>
        )}
      </div>
    </div>
  );
}
