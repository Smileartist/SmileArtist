import { useState, useEffect } from "react";
import { Search, Heart, MessageCircle, User, Filter, X } from "lucide-react";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { PostCard } from "./PostCard";

export function SearchPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Search Header */}
      <div className="mb-8">
        <h2 className="mb-4" style={{ color: 'var(--theme-text)' }}>Explore</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" style={{ color: 'var(--theme-text)' }} />
          <Input
            type="text"
            placeholder="Search for poems, poets, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 h-14 rounded-2xl border-2 transition-all focus:shadow-lg bg-[var(--theme-card-bg)]"
            style={{ borderColor: 'var(--theme-primary)33', color: 'var(--theme-text)' }}
          />
        </div>
      </div>

      <div className="text-center py-20">
        <Search className="w-16 h-16 mx-auto mb-4 opacity-10" style={{ color: 'var(--theme-text)' }} />
        <p className="opacity-50" style={{ color: 'var(--theme-text)' }}>Search for something beautiful...</p>
      </div>
    </div>
  );
}
