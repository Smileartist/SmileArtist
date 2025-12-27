import { Search, X } from "lucide-react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface SearchPanelProps {
  onClose?: () => void;
}

export function SearchPanel({ onClose }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const trendingTags = [
    { tag: "love", posts: "12.5k" },
    { tag: "nature", posts: "8.2k" },
    { tag: "heartbreak", posts: "6.8k" },
    { tag: "hope", posts: "5.3k" },
    { tag: "nostalgia", posts: "4.7k" },
  ];

  const featuredPoets = [
    { name: "Emily Rivers", username: "emilyrivers", followers: "45.2k", avatar: "https://images.unsplash.com/photo-1624537046903-1e4acee0487f?w=100&h=100&fit=crop" },
    { name: "Marcus Vale", username: "marcusvale", followers: "38.1k", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" },
    { name: "Sarah Chen", username: "sarahwrites", followers: "29.8k", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" },
  ];

  return (
    <div 
      className="h-full backdrop-blur-sm max-w-2xl mx-auto"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 'var(--theme-border-radius)',
      }}
    >
      <div 
        className="sticky top-16 md:top-0 backdrop-blur-md border-b p-4 md:p-6 -mx-4 md:mx-0"
        style={{
          background: `linear-gradient(to right, rgba(255,255,255,0.9), var(--theme-accent))`,
          borderColor: `var(--theme-primary)33`,
          borderRadius: `var(--theme-border-radius) var(--theme-border-radius) 0 0`,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <h2 className="flex-1" style={{ color: 'var(--theme-text)' }}>Search</h2>
          {onClose && (
            <button 
              onClick={onClose}
              style={{ color: 'var(--theme-text)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--theme-text)'}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: 'var(--theme-primary)' }}
          />
          <Input
            type="text"
            placeholder="Search poetry, writers, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/50"
            style={{
              borderColor: `var(--theme-primary)33`,
              borderRadius: 'var(--theme-border-radius)',
            }}
          />
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6 md:space-y-8">
        <div>
          <h3 className="mb-4" style={{ color: 'var(--theme-text)' }}>Trending Tags</h3>
          <div className="space-y-3">
            {trendingTags.map((item, index) => (
              <button
                key={index}
                className="w-full flex items-center justify-between p-3 transition-all text-left"
                style={{ borderRadius: 'var(--theme-border-radius)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `var(--theme-accent)80`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div>
                  <p style={{ color: 'var(--theme-text)' }}>#{item.tag}</p>
                  <p className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>{item.posts} posts</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4" style={{ color: 'var(--theme-text)' }}>Featured Poets</h3>
          <div className="space-y-4">
            {featuredPoets.map((poet, index) => (
              <div key={index} className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={poet.avatar} />
                  <AvatarFallback>{poet.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p style={{ color: 'var(--theme-text)' }}>{poet.name}</p>
                  <p className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>@{poet.username}</p>
                </div>
                <button 
                  className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-white transition-all whitespace-nowrap shadow-md"
                  style={{
                    background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`,
                    borderRadius: 'var(--theme-border-radius)',
                  }}
                >
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4" style={{ color: 'var(--theme-text)' }}>Popular Topics</h3>
          <div className="flex flex-wrap gap-2">
            {['Sonnets', 'Free Verse', 'Haiku', 'Short Stories', 'Micro Poetry', 'Prose'].map((topic) => (
              <Badge 
                key={topic}
                variant="secondary" 
                className="cursor-pointer transition-all border-none"
                style={{
                  backgroundColor: 'var(--theme-accent)',
                  color: 'var(--theme-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-primary)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
                  e.currentTarget.style.color = 'var(--theme-primary)';
                }}
              >
                {topic}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
