 import { useState } from "react";
import { PenTool, Type, Send, Image as ImageIcon, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { supabase } from "../utils/supabaseClient";
import { toast } from "sonner";

export function WritePost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const suggestedCategories = [
    "Love", "Heartbreak", "Nature", "Urban Life", "Healing", 
    "Self Discovery", "Haiku", "Modern Life", "Resilience", 
    "Daily Life", "Inspiration", "Motivation", "Friendship"
  ];

  const handleAddCategory = (cat: string) => {
    if (!selectedCategories.includes(cat) && selectedCategories.length < 3) {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleRemoveCategory = (cat: string) => {
    setSelectedCategories(selectedCategories.filter(c => c !== cat));
  };

  const handlePublish = async (type: string) => {
    if (!content.trim()) {
      toast.error("Please write something before publishing.");
      return;
    }

    setIsPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to publish.");
        return;
      }

      // // Fetch user profile for display name and avatar
      // const { data: profile } = await supabase
      //   .from("profiles")
      //   .select("username, avatar_url")
      //   .eq("id", user.id)
      //   .single();

     const { error } = await supabase.from("posts").insert([
  {
    title: title.trim() || (type === 'haiku' ? 'Untitled Haiku' : 'Untitled'),
    content: content.trim(),
    categories: selectedCategories,
    user_id: user.id,
    created_at: new Date().toISOString(),
  },
]);


      if (error) throw error;

      toast.success("Post published successfully!");
      setTitle("");
      setContent("");
      setSelectedCategories([]);
    } catch (error: any) {
      console.error("Error publishing post:", error);
      toast.error(error.message || "Failed to publish post.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            <PenTool className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} />
          </div>
          <h1 style={{ color: 'var(--theme-text)' }}>Write Your Heart</h1>
        </div>
        <p style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
          Share your thoughts, poems, and stories with the world
        </p>
      </div>

      {/* Writing Mode Tabs */}
      <Tabs defaultValue="poem" className="mb-6">
        <TabsList 
          className="grid w-full grid-cols-3 mb-6 rounded-xl shadow-md"
          style={{ backgroundColor: 'var(--theme-accent)' }}
        >
          <TabsTrigger value="poem" className="rounded-xl">
            <Type className="w-4 h-4 mr-2" />
            Poem
          </TabsTrigger>
          <TabsTrigger value="story" className="rounded-xl">
            <PenTool className="w-4 h-4 mr-2" />
            Story
          </TabsTrigger>
          <TabsTrigger value="haiku" className="rounded-xl">
            <Type className="w-4 h-4 mr-2" />
            Haiku
          </TabsTrigger>
        </TabsList>

        <TabsContent value="poem">
          <WriteForm 
            title={title}
            setTitle={setTitle}
            content={content}
            setContent={setContent}
            selectedCategories={selectedCategories}
            handleRemoveCategory={handleRemoveCategory}
            suggestedCategories={suggestedCategories}
            handleAddCategory={handleAddCategory}
            handlePublish={() => handlePublish("poem")}
            isPublishing={isPublishing}
            placeholder="Let your emotions flow through verses..."
            titlePlaceholder="Your Poem's Title"
          />
        </TabsContent>

        <TabsContent value="story">
          <WriteForm 
            title={title}
            setTitle={setTitle}
            content={content}
            setContent={setContent}
            selectedCategories={selectedCategories}
            handleRemoveCategory={handleRemoveCategory}
            suggestedCategories={suggestedCategories}
            handleAddCategory={handleAddCategory}
            handlePublish={() => handlePublish("story")}
            isPublishing={isPublishing}
            placeholder="Tell your story in prose..."
            titlePlaceholder="Your Story's Title"
          />
        </TabsContent>

        <TabsContent value="haiku">
          <WriteForm 
            title={title}
            setTitle={setTitle}
            content={content}
            setContent={setContent}
            selectedCategories={selectedCategories}
            handleRemoveCategory={handleRemoveCategory}
            suggestedCategories={suggestedCategories}
            handleAddCategory={handleAddCategory}
            handlePublish={() => handlePublish("haiku")}
            isPublishing={isPublishing}
            placeholder="Three lines, 5-7-5 syllables..."
            titlePlaceholder="Your Haiku's Title (optional)"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface WriteFormProps {
  title: string;
  setTitle: (value: string) => void;
  content: string;
  setContent: (value: string) => void;
  selectedCategories: string[];
  handleRemoveCategory: (cat: string) => void;
  suggestedCategories: string[];
  handleAddCategory: (cat: string) => void;
  handlePublish: () => void;
  placeholder: string;
  titlePlaceholder: string;
  isPublishing: boolean;
}

function WriteForm({
  title,
  setTitle,
  content,
  setContent,
  selectedCategories,
  handleRemoveCategory,
  suggestedCategories,
  handleAddCategory,
  handlePublish,
  placeholder,
  titlePlaceholder,
  isPublishing,
}: WriteFormProps) {
  return (
    <div className="space-y-6">
      {/* Title Input */}
      <div 
        className="p-6 rounded-2xl shadow-md"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          border: `1px solid var(--theme-primary)33`,
        }}
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
          className="w-full text-2xl outline-none bg-transparent"
          style={{ 
            color: 'var(--theme-text)',
            fontFamily: 'var(--theme-font-family)',
          }}
        />
      </div>

      {/* Content Textarea */}
      <div 
        className="p-6 rounded-2xl shadow-md"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          border: `1px solid var(--theme-primary)33`,
        }}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={12}
          className="w-full outline-none resize-none bg-transparent"
          style={{ 
            color: 'var(--theme-text)',
            fontFamily: 'var(--theme-font-family)',
            fontSize: '16px',
            lineHeight: '1.8',
          }}
        />
        <div className="mt-4 flex items-center justify-between">
          <span 
            className="text-sm"
            style={{ color: 'var(--theme-text)', opacity: 0.5 }}
          >
            {content.length} characters
          </span>
        </div>
      </div>

      {/* Categories */}
      <div 
        className="p-6 rounded-2xl shadow-md"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          border: `1px solid var(--theme-primary)33`,
        }}
      >
        <h3 className="mb-3" style={{ color: 'var(--theme-text)' }}>
          Categories (Max 3)
        </h3>
        
        {/* Selected Categories */}
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedCategories.map((cat) => (
              <Badge 
                key={cat}
                className="px-3 py-1 flex items-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'white',
                }}
                onClick={() => handleRemoveCategory(cat)}
              >
                {cat}
                <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        )}

        {/* Suggested Categories */}
        <div className="flex flex-wrap gap-2">
          {suggestedCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleAddCategory(cat)}
              disabled={selectedCategories.includes(cat) || selectedCategories.length >= 3}
              className="px-3 py-1 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                backgroundColor: selectedCategories.includes(cat) 
                  ? 'var(--theme-primary)33' 
                  : 'var(--theme-accent)',
                color: 'var(--theme-primary)',
                border: `1px solid ${selectedCategories.includes(cat) ? 'var(--theme-primary)' : 'transparent'}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          className="rounded-xl"
          style={{
            borderColor: 'var(--theme-primary)',
            color: 'var(--theme-primary)',
          }}
        >
          Save Draft
        </Button>
        <Button
          className="rounded-xl text-white shadow-md"
          style={{
            background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`,
          }}
          onClick={handlePublish}
          disabled={isPublishing}
        >
          <Send className="w-4 h-4 mr-2" />
          {isPublishing ? "Publishing..." : "Publish"}
        </Button>
      </div>
    </div>
  );
}
