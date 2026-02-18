import { useState, useEffect } from "react";
import { Search, User as UserIcon } from "lucide-react";
import { Input } from "./ui/input";
import { PostCard } from "./PostCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { TrendingPage } from "./TrendingPage";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { searchPosts, Post, searchUsers, User } from "../utils/supabaseQueries";

interface SearchPanelProps {
  onViewChange?: (view: string, userId?: string | null) => void;
}

export function SearchPanel({ onViewChange }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]); // New state for user search results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim() === "") {
        setSearchResults([]);
        setUserSearchResults([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [posts, users] = await Promise.all([
          searchPosts(searchQuery),
          searchUsers(searchQuery),
        ]);
        setSearchResults(posts);
        setUserSearchResults(users);
      } catch (err) {
        console.error("Error during search:", err);
        setError("Failed to fetch search results.");
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const hasResults = searchResults.length > 0 || userSearchResults.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Search Header */}
      <div className="mb-8">
        <h2 className="mb-4" style={{ color: 'var(--theme-text)' }}>Explore</h2>
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" style={{ color: 'var(--theme-text)' }} />
          <Input
            type="text"
            placeholder="Search for poems, poets, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-12 h-14 rounded-2xl border-2 transition-all focus:shadow-lg bg-[var(--theme-card-bg)]"
            style={{ borderColor: 'var(--theme-primary)33', color: 'var(--theme-text)' }}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          {loading && (
            <div className="text-center py-20">
              <p style={{ color: 'var(--theme-text)' }}>Searching...</p>
            </div>
          )}
          {error && (
            <div className="text-center py-20">
              <p className="text-red-500">{error}</p>
            </div>
          )}
          {!loading && !error && searchQuery.trim() !== "" && !hasResults && (
            <div className="text-center py-20">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-10" style={{ color: 'var(--theme-text)' }} />
              <p className="opacity-50" style={{ color: 'var(--theme-text)' }}>No results found for "{searchQuery}".</p>
            </div>
          )}

          {!loading && !error && hasResults && (
            <div className="space-y-8">
              {userSearchResults.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>Users</h3>
                  <div className="grid gap-4">
                    {userSearchResults.map((user) => (
                      <div key={user.id} className="flex items-center gap-4 p-4 rounded-xl shadow-sm" style={{ backgroundColor: 'var(--theme-card-bg)', border: `1px solid var(--theme-primary)33` }}>
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}`} />
                          <AvatarFallback>{user.full_name ? user.full_name[0] : (user.username ? user.username[0] : "?")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold" style={{ color: 'var(--theme-text)' }}>{user.full_name}</p>
                          <p className="text-sm opacity-60" style={{ color: 'var(--theme-text)' }}>@{user.username}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="ml-auto rounded-lg" 
                          style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }}
                          onClick={() => onViewChange?.("profile", user.id)}
                        >
                          View Profile
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>Posts</h3>
                  <div className="grid gap-4">
                    {searchResults.map((post) => (
                      <PostCard key={post.postId} post={post} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!loading && !error && searchQuery.trim() === "" && (
             <div className="text-center py-20">
             <Search className="w-16 h-16 mx-auto mb-4 opacity-10" style={{ color: 'var(--theme-text)' }} />
             <p className="opacity-50" style={{ color: 'var(--theme-text)' }}>Search for something beautiful...</p>
           </div>
          )}
        </TabsContent>
        <TabsContent value="trending">
          <TrendingPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
