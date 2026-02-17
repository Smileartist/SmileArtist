import { useState, useEffect } from "react";
import { TrendingUp, Flame, Clock, Calendar, Loader2 } from "lucide-react";
import { PostCard } from "./PostCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { getTrendingPosts, getTrendingAuthors, getTrendingTopics } from "../utils/supabaseQueries";

export function TrendingPage() {
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "all">("today");
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [trendingAuthors, setTrendingAuthors] = useState<any[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrendingData() {
      setLoading(true);
      try {
        const [posts, authors, topics] = await Promise.all([
          getTrendingPosts(timeFilter),
          getTrendingAuthors(timeFilter),
          getTrendingTopics(timeFilter)
        ]);
        
        const postsWithFormattedDate = posts.map(post => ({
          ...post,
          created_at: new Date(post.created_at).toLocaleDateString()
        }));

        setTrendingPosts(postsWithFormattedDate);
        setTrendingAuthors(authors);
        setTrendingTopics(topics);
      } catch (error) {
        console.error("Error fetching trending data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrendingData();
  }, [timeFilter]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            <Flame className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} />
          </div>
          <h1 style={{ color: 'var(--theme-text)' }}>Trending</h1>
        </div>
        <p style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
          Discover the most popular poems and stories right now
        </p>
      </div>

      {/* Time Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: "today", label: "Today", icon: Clock },
          { id: "week", label: "This Week", icon: Calendar },
          { id: "month", label: "This Month", icon: null },
          { id: "all", label: "All Time", icon: null },
        ].map((filter) => (
          <Button
            key={filter.id}
            variant={timeFilter === filter.id ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeFilter(filter.id as any)}
            className="rounded-xl"
            style={{
              background: timeFilter === filter.id 
                ? `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`
                : 'transparent',
              color: timeFilter === filter.id ? 'white' : 'var(--theme-primary)',
              borderColor: timeFilter === filter.id ? 'transparent' : 'var(--theme-primary)',
            }}
          >
            {filter.icon && <filter.icon className="w-4 h-4 mr-2" />}
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trending Posts - Main Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: 'var(--theme-text)' }}>Top Posts</h3>
            <Badge 
              className="px-3 py-1"
              style={{
                backgroundColor: 'var(--theme-accent)',
                color: 'var(--theme-primary)',
              }}
            >
              Updated hourly
            </Badge>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: 'var(--theme-primary)' }} />
              <p style={{ color: 'var(--theme-text)' }}>Loading trending content...</p>
            </div>
          ) : trendingPosts.length > 0 ? (
            trendingPosts.map((post, index) => (
              <div key={post.postId || index} className="relative">
                <div 
                  className="absolute -left-2 -top-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-10"
                  style={{
                    background: index < 3 
                      ? `linear-gradient(to bottom right, var(--theme-primary), var(--theme-secondary))`
                      : 'var(--theme-accent)',
                    color: index < 3 ? 'white' : 'var(--theme-primary)',
                  }}
                >
                  <span className="font-bold">{index + 1}</span>
                </div>
                <PostCard post={post} />
              </div>
            ))
          ) : (
            <div className="text-center py-20 opacity-50">
              <p style={{ color: 'var(--theme-text)' }}>No trending posts found for this period.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trending Authors */}
          <div 
            className="rounded-2xl p-5 shadow-md"
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              border: `1px solid var(--theme-primary)33`,
            }}
          >
            <h3 className="mb-4 flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
              Trending Authors
            </h3>
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                    <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : trendingAuthors.length > 0 ? (
                trendingAuthors.map((author, index) => (
                  <div key={author.username || index} className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `linear-gradient(to bottom right, var(--theme-primary), var(--theme-secondary))`,
                        color: 'white',
                      }}
                    >
                      {index + 1}
                    </div>
                    <img 
                      src={author.avatar || "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"} 
                      alt={author.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ color: 'var(--theme-text)' }}>
                        <strong>{author.name}</strong>
                      </p>
                      <p className="text-sm truncate" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
                        {author.posts_count} posts
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      className="rounded-lg"
                      style={{
                        backgroundColor: 'var(--theme-primary)',
                        color: 'white',
                      }}
                    >
                      Follow
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-center py-4 opacity-50" style={{ color: 'var(--theme-text)' }}>
                  No trending authors yet.
                </p>
              )}
            </div>
          </div>

          {/* Trending Topics */}
          <div 
            className="rounded-2xl p-5 shadow-md"
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              border: `1px solid var(--theme-primary)33`,
            }}
          >
            <h3 className="mb-4 flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
              <Flame className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
              Hot Topics
            </h3>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                ))
              ) : trendingTopics.length > 0 ? (
                trendingTopics.map((topic, index) => (
                  <button 
                    key={index}
                    className="w-full text-left p-3 rounded-xl transition-all hover:shadow-sm"
                    style={{
                      backgroundColor: 'var(--theme-accent)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--theme-primary)22';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p style={{ color: 'var(--theme-text)' }}>
                          <strong>#{topic.name}</strong>
                        </p>
                        <p className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
                          {topic.count}
                        </p>
                      </div>
                      {topic.trending !== "N/A" && (
                        <Badge 
                          className="px-2 py-0.5 flex-shrink-0"
                          style={{
                            backgroundColor: 'var(--theme-primary)',
                            color: 'white',
                          }}
                        >
                          {topic.trending}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-center py-4 opacity-50" style={{ color: 'var(--theme-text)' }}>
                  No hot topics yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
