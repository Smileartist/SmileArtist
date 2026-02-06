import { useState, useEffect } from "react";
import { BookOpen, Heart, Bookmark, FolderOpen, Plus, Grid, List, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { PostCard } from "./PostCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "../utils/supabaseClient";

interface Post {
  id: string;
  title: string;
  content: string;
  author: { name: string; username: string; avatar: string };
  timestamp: string;
  savedDate?: string;
  readDate?: string;
  likes: number;
  comments: number;
  category?: string;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  coverColor: string;
  postCount: number;
  lastUpdated: string;
}

export function LibraryPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [readingHistory, setReadingHistory] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLibraryData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (sessionData.session) {
          const userId = sessionData.session.user.id;

          // Fetch Saved Posts
          const { data: savedData, error: savedError } = await supabase
            .from("saved_posts")
            .select(`
              id, title, content, author:users(name, username, avatar), created_at,
              likes, comments, category,
              saved_at:saved_posts_metadata(saved_at)
            `)
            .eq("user_id", userId)
            .order("saved_at", { ascending: false, foreignTable: "saved_posts_metadata" });
          if (savedError) throw savedError;
          setSavedPosts((savedData || []).map((post: any) => ({
            id: post.id,
            title: post.title,
            content: post.content,
            author: {
              name: post.users?.name || "Unknown",
              username: post.users?.username || "unknown",
              avatar: post.users?.avatar || "",
            },
            timestamp: new Date(post.created_at).toLocaleString(),
            savedDate: post.saved_posts_metadata?.saved_at ? new Date(post.saved_posts_metadata.saved_at).toLocaleString() : undefined,
            likes: post.likes || 0,
            comments: post.comments || 0,
            category: post.category,
          })));

          // Fetch My Posts
          const { data: myPostsData, error: myPostsError } = await supabase
            .from("posts")
            .select(`id, title, content, author:users(name, username, avatar), created_at, likes, comments, category`)
            .eq("author_id", userId)
            .order("created_at", { ascending: false });
          if (myPostsError) throw myPostsError;
          setMyPosts((myPostsData || []).map((post: any) => ({
            id: post.id,
            title: post.title,
            content: post.content,
            author: {
              name: post.users?.name || "Unknown",
              username: post.users?.username || "unknown",
              avatar: post.users?.avatar || "",
            },
            timestamp: new Date(post.created_at).toLocaleString(),
            likes: post.likes || 0,
            comments: post.comments || 0,
            category: post.category,
          })));

          // Fetch Collections
          const { data: collectionsData, error: collectionsError } = await supabase
            .from("collections")
            .select("id, name, description, cover_color, post_count, updated_at")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false });
          if (collectionsError) throw collectionsError;
          setCollections((collectionsData || []).map((collection: any) => ({
            id: collection.id,
            name: collection.name,
            description: collection.description,
            coverColor: collection.cover_color,
            postCount: collection.post_count,
            lastUpdated: new Date(collection.updated_at).toLocaleString(),
          })));

          // Fetch Reading History
          const { data: historyData, error: historyError } = await supabase
            .from("reading_history")
            .select(`post:posts(id, title, content, author:users(name, username, avatar), created_at, likes, comments, category), read_at`)
            .eq("user_id", userId)
            .order("read_at", { ascending: false });
          if (historyError) throw historyError;
          setReadingHistory((historyData || []).map((entry: any) => ({
            id: entry.post.id,
            title: entry.post.title,
            content: entry.post.content,
            author: {
              name: entry.post.users?.name || "Unknown",
              username: entry.post.users?.username || "unknown",
              avatar: entry.post.users?.avatar || "",
            },
            timestamp: new Date(entry.post.created_at).toLocaleString(),
            readDate: new Date(entry.read_at).toLocaleString(),
            likes: entry.post.likes || 0,
            comments: entry.post.comments || 0,
            category: entry.post.category,
          })));

        } else {
          setSavedPosts([]);
          setMyPosts([]);
          setCollections([]);
          setReadingHistory([]);
        }
      } catch (error) {
        console.error("Error fetching library data:", error);
        setError("Failed to load library data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchLibraryData();
  }, []);

  const renderPostCard = (post: Post) => (
    <div key={post.id} className="relative">
      <PostCard 
        title={post.title}
        content={post.content}
        author={post.author}
        timestamp={post.timestamp}
        likes={post.likes}
        comments={post.comments}
        category={post.category}
      />
      {post.savedDate && (
        <div 
          className="absolute top-4 right-4 px-2 py-1 rounded-lg text-xs"
          style={{
            backgroundColor: 'var(--theme-accent)',
            color: 'var(--theme-primary)',
          }}
        >
          Saved {post.savedDate}
        </div>
      )}
      {post.readDate && (
        <div 
          className="absolute top-4 right-4 px-2 py-1 rounded-lg text-xs flex items-center gap-1"
          style={{
            backgroundColor: 'var(--theme-accent)',
            color: 'var(--theme-primary)',
          }}
        >
          <Clock className="w-3 h-3" />
          Read {post.readDate}
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div className="text-center py-12" style={{ color: 'var(--theme-text)' }}>Loading library...</div>;
  }

  if (error) {
    return <div className="text-center py-12" style={{ color: 'red' }}>{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <BookOpen className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} />
            </div>
            <div>
              <h1 style={{ color: 'var(--theme-text)' }}>Your Library</h1>
              <p className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
                All your saved content in one place
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-lg"
              style={{
                backgroundColor: viewMode === "list" ? 'var(--theme-primary)' : 'transparent',
                color: viewMode === "list" ? 'white' : 'var(--theme-primary)',
                borderColor: 'var(--theme-primary)',
              }}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-lg"
              style={{
                backgroundColor: viewMode === "grid" ? 'var(--theme-primary)' : 'transparent',
                color: viewMode === "grid" ? 'white' : 'var(--theme-primary)',
                borderColor: 'var(--theme-primary)',
              }}
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div 
          className="p-4 rounded-2xl shadow-sm"
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            border: `1px solid var(--theme-primary)33`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Bookmark className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>Saved</span>
          </div>
          <p style={{ color: 'var(--theme-text)' }}><strong>{savedPosts.length}</strong> posts</p>
        </div>
        <div 
          className="p-4 rounded-2xl shadow-sm"
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            border: `1px solid var(--theme-primary)33`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>Collections</span>
          </div>
          <p style={{ color: 'var(--theme-text)' }}><strong>{collections.length}</strong> collections</p>
        </div>
        <div 
          className="p-4 rounded-2xl shadow-sm"
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            border: `1px solid var(--theme-primary)33`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>Your Posts</span>
          </div>
          <p style={{ color: 'var(--theme-text)' }}><strong>{myPosts.length}</strong> posts</p>
        </div>
        <div 
          className="p-4 rounded-2xl shadow-sm"
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            border: `1px solid var(--theme-primary)33`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>Read</span>
          </div>
          <p style={{ color: 'var(--theme-text)' }}><strong>{readingHistory.length}</strong> posts</p>
        </div>
      </div>

      <Tabs defaultValue="saved" className="w-full">
        <TabsList 
          className="grid w-full grid-cols-4 mb-6 rounded-xl shadow-md"
          style={{ backgroundColor: 'var(--theme-accent)' }}
        >
          <TabsTrigger value="saved" className="rounded-xl">
            <Bookmark className="w-4 h-4 mr-2" />
            Saved
          </TabsTrigger>
          <TabsTrigger value="collections" className="rounded-xl">
            <FolderOpen className="w-4 h-4 mr-2" />
            Collections
          </TabsTrigger>
          <TabsTrigger value="myposts" className="rounded-xl">
            <BookOpen className="w-4 h-4 mr-2" />
            My Posts
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl">
            <Clock className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved">
          <div className="flex items-center justify-between mb-4">
            <p style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              {savedPosts.length} saved posts
            </p>
          </div>
          <div className="space-y-4">
            {savedPosts.length > 0 ? (
              savedPosts.map((post) => renderPostCard(post))
            ) : (
              <div className="text-center py-12">
                <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--theme-primary)' }} />
                <p style={{ color: 'var(--theme-text)', opacity: 0.5 }}>No saved posts yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="collections">
          <div className="mb-4 flex justify-between items-center">
            <p style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              {collections.length} collections
            </p>
            <Button 
              size="sm"
              className="rounded-xl text-white shadow-md"
              style={{
                background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`,
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Collection
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collections.length > 0 ? (
              collections.map((collection) => (
                <button
                  key={collection.id}
                  className="text-left p-6 rounded-2xl shadow-md transition-all hover:shadow-lg"
                  style={{
                    backgroundColor: 'var(--theme-card-bg)',
                    border: `1px solid var(--theme-primary)33`,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: collection.coverColor + '33' }}
                    >
                      <FolderOpen className="w-8 h-8" style={{ color: collection.coverColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="mb-1" style={{ color: 'var(--theme-text)' }}>{collection.name}</h3>
                      <p className="text-sm mb-2 line-clamp-2" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>{collection.description}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <Badge variant="secondary" className="px-2 py-0.5" style={{ backgroundColor: 'var(--theme-accent)', color: 'var(--theme-primary)' }}>{collection.postCount} posts</Badge>
                        <span style={{ color: 'var(--theme-text)', opacity: 0.5 }}>Updated {collection.lastUpdated}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--theme-primary)' }} />
                <p style={{ color: 'var(--theme-text)', opacity: 0.5 }}>No collections created yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="myposts">
          <div className="flex items-center justify-between mb-4">
            <p style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              {myPosts.length} published posts
            </p>
            <Button 
              size="sm"
              className="rounded-xl text-white shadow-md"
              style={{
                background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`,
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Write New Post
            </Button>
          </div>
          <div className="space-y-4">
            {myPosts.length > 0 ? (
              myPosts.map((post) => renderPostCard(post))
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--theme-primary)' }} />
                <p style={{ color: 'var(--theme-text)', opacity: 0.5 }}>You haven't published any posts yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="mb-4">
            <p style={{ color: 'var(--theme-text)', opacity: 0.7 }}>Recently read posts</p>
          </div>
          <div className="space-y-4">
            {readingHistory.length > 0 ? (
              readingHistory.map((post) => renderPostCard(post))
            ) : (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--theme-primary)' }} />
                <p style={{ color: 'var(--theme-text)', opacity: 0.5 }}>Your reading history will appear here.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
