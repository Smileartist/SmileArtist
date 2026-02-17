import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { PostCard } from "./PostCard";
import { supabase } from "../utils/supabaseClient";
import { Post } from "../utils/supabaseQueries";

export function LibraryPage() {
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLibraryData = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSavedPosts([]);
        setLoading(false);
        return;
      }

      const userId = user.id;

      // =========================
      // SAVED POSTS
      // =========================
      const { data: savedData } = await supabase
        .from("saved_posts")
        .select(`
          post:posts(
            id,
            title,
            content,
            created_at,
            likes,
            comments,
            category,
            user_id,
            author:user_id (
              full_name,
              username,
              avatar_url
            )
          )
        `)
        .eq("user_id", userId);

      const formattedSaved = (savedData || []).map((row: any) => {
        const p = row.post;
        const authorProfile = Array.isArray(p.author) ? p.author[0] : p.author;
        return {
          postId: p.id,
          title: p.title || "Untitled",
          content: p.content,
          user_id: p.user_id,
          created_at: p.created_at,
          likes: p.likes || 0,
          comments: p.comments || 0,
          category: p.category || "",
          author: {
            full_name: authorProfile?.full_name || "Anonymous",
            username: authorProfile?.username || "user",
            avatar_url: authorProfile?.avatar_url || "",
          },
        };
      });

      setSavedPosts(formattedSaved);
      setLoading(false);
    };

    fetchLibraryData();
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading library...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs defaultValue="saved" className="w-full">
        <TabsList className="grid w-full grid-cols-1 mb-6">
          <TabsTrigger value="saved">
            <Bookmark className="w-4 h-4 mr-2" />
            Saved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved">
          {savedPosts.length > 0 ? (
            savedPosts.map((post) => (
              <div key={post.postId} className="mb-4">
                <PostCard post={post} />
              </div>
            ))
          ) : (
            <div className="text-center py-12 opacity-60">
              No saved posts yet
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
