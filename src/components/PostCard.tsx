import { Heart, MessageCircle, Bookmark, MoreHorizontal } from "lucide-react";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface PostCardProps {
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  title?: string;
  likes: number;
  comments: number;
  timestamp: string;
  category?: string;
}

export function PostCard({ author, content, title, likes, comments, timestamp, category }: PostCardProps) {
  const cardRadius = getComputedStyle(document.documentElement).getPropertyValue('--theme-border-radius') || '1rem';
  
  return (
    <Card 
      className="bg-white/80 backdrop-blur-sm p-4 md:p-6 hover:shadow-lg transition-all"
      style={{
        border: `1px solid var(--theme-primary)`,
        borderColor: `var(--theme-primary)33`,
        borderRadius: cardRadius,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={author.avatar} />
            <AvatarFallback>{author.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p style={{ color: 'var(--theme-text)' }}>{author.name}</p>
            <p className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>@{author.username} · {timestamp}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          style={{ color: 'var(--theme-text)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--theme-primary)';
            e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--theme-text)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {category && (
        <span 
          className="inline-block px-3 py-1 text-xs rounded-full mb-3"
          style={{
            color: 'var(--theme-primary)',
            backgroundColor: 'var(--theme-accent)',
          }}
        >
          {category}
        </span>
      )}

      {title && (
        <h3 className="mb-3" style={{ color: 'var(--theme-text)' }}>{title}</h3>
      )}

      <div 
        className="mb-4 whitespace-pre-line leading-relaxed italic"
        style={{ color: 'var(--theme-text)', opacity: 0.8 }}
      >
        {content}
      </div>

      <div 
        className="flex items-center gap-4 md:gap-6 pt-4 border-t"
        style={{ borderColor: `var(--theme-primary)1a` }}
      >
        <button 
          className="flex items-center gap-1.5 md:gap-2 transition-colors"
          style={{ color: 'var(--theme-text)', opacity: 0.6 }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--theme-text)'}
        >
          <Heart className="w-4 h-4 md:w-5 md:h-5" />
          <span className="text-sm">{likes}</span>
        </button>
        <button 
          className="flex items-center gap-1.5 md:gap-2 transition-colors"
          style={{ color: 'var(--theme-text)', opacity: 0.6 }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-secondary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--theme-text)'}
        >
          <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
          <span className="text-sm">{comments}</span>
        </button>
        <button 
          className="flex items-center gap-1.5 md:gap-2 transition-colors ml-auto"
          style={{ color: 'var(--theme-text)', opacity: 0.6 }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--theme-text)'}
        >
          <Bookmark className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </Card>
  );
}
