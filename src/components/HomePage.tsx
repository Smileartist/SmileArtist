import { useEffect, useState } from "react";
import { PostCard } from "./PostCard";
import { supabase } from "../utils/supabaseClient";
import { BookOpen, Users } from "lucide-react";

export function HomePage() {
  const [followedPosts, setFollowedPosts] = useState<any[]>([]);
  const [otherPosts, setOtherPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // 1. Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // 2. Get the IDs of people the current user follows
        let followedIds: string[] = [];
        if (user) {
          const { data: followRows } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id);
          followedIds = (followRows || []).map((r: any) => r.following_id);
        }

        // 3. Fetch all posts newest first
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
            user_id: post.user_id,
            author: {
              full_name: name,
              username: authorProfile?.username || "user",
              avatar_url:
                authorProfile?.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
            },
          };
        });

        // 4. Split into followed vs the rest
        const followed = formatted.filter(p => followedIds.includes(p.user_id));
        const others = formatted.filter(p => !followedIds.includes(p.user_id));

        setFollowedPosts(followed);
        setOtherPosts(others);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setFollowedPosts([]);
        setOtherPosts([]);
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

  const totalPosts = followedPosts.length + otherPosts.length;

  if (totalPosts === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 border rounded-3xl">
        <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <h2 className="text-xl mb-2">No posts yet</h2>
        <p>Be the first to share something.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* ── Followed users' posts (priority section) ── */}
      {followedPosts.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-1 pt-2">
            <Users className="w-4 h-4" style={{ color: "var(--theme-primary)" }} />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--theme-primary)" }}
            >
              From people you follow
            </span>
          </div>
          {followedPosts.map((post, i) => (
            <PostCard key={`followed-${i}`} post={post} />
          ))}

          {/* Divider before the rest */}
          {otherPosts.length > 0 && (
            <div
              className="flex items-center gap-3 px-1 pt-2"
            >
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--theme-primary)", opacity: 0.15 }} />
              <span
                className="text-xs font-medium opacity-50"
                style={{ color: "var(--theme-text)" }}
              >
                More posts
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--theme-primary)", opacity: 0.15 }} />
            </div>
          )}
        </>
      )}

      {/* ── Everyone else's posts ── */}
      {otherPosts.map((post, i) => (
        <PostCard key={`other-${i}`} post={post} />
      ))}
    </div>
  );
}
