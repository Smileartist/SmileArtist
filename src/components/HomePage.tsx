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
            id,
            title,
            content,
            likes,
            comments,
            created_at,
            author:user_id (
              full_name,
              username,
              avatar_url
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map((post: any) => {
          const authorProfile = Array.isArray(post.author) ? post.author[0] : post.author;

          const name = authorProfile?.full_name || "Anonymous";

          return {
            postId: post.id,
            title: post.title,
            content: post.content,
            likes: post.likes || 0,
            comments: post.comments || 0,
            created_at: new Date(post.created_at).toLocaleDateString(),
            category: "General",
            author: {
              full_name: name,
              username: authorProfile?.username || "user",
              avatar_url:
                authorProfile?.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`
            }
          };
        });

        setPosts(formatted);
      } catch (err) {
        console.error("Error fetching posts:", err);
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
        <p>Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {posts.length > 0 ? (
        posts.map((post, i) => (
          <PostCard key={i} post={post} />
        ))
      ) : (
        <div className="text-center py-20 border rounded-3xl">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h2 className="text-xl mb-2">No posts yet</h2>
          <p>Be the first to share something.</p>
        </div>
      )}
    </div>
  );
}
