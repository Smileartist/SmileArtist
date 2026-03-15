import React, { useState, useEffect } from "react";
import { PenTool, Type, Send, FileText, Mail, X, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { supabase } from "../utils/supabaseClient";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AnalysisPanel } from "./AnalysisPanel";
import "../styles/verse-theme.css";

// --- VerseVibe Sentiment Themes ---
const sentimentThemes: Record<string, any> = {
  Melancholic: {
    orb1: 'rgba(96,165,250,0.5)',   // blue
    orb2: 'rgba(147,197,253,0.4)',
    orb3: 'rgba(59,130,246,0.3)',
    overlay: 'rgba(30,58,138,0.12)',
    accent: '#60a5fa',
    accentGlow: 'rgba(96,165,250,0.45)',
    border: 'rgba(96,165,250,0.3)',
    gradientBg: 'radial-gradient(ellipse at 20% 20%, rgba(30,58,138,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.2) 0%, transparent 60%)',
    badge: { bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.4)', text: '#93c5fd' },
  },
  Joyful: {
    orb1: 'rgba(251,191,36,0.55)',  // gold
    orb2: 'rgba(252,211,77,0.4)',
    orb3: 'rgba(245,158,11,0.35)',
    overlay: 'rgba(120,80,0,0.1)',
    accent: '#fbbf24',
    accentGlow: 'rgba(251,191,36,0.5)',
    border: 'rgba(251,191,36,0.3)',
    gradientBg: 'radial-gradient(ellipse at 30% 10%, rgba(120,80,0,0.25) 0%, transparent 60%), radial-gradient(ellipse at 70% 90%, rgba(245,158,11,0.2) 0%, transparent 55%)',
    badge: { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)', text: '#fde68a' },
  },
  Dark: {
    orb1: 'rgba(71,85,105,0.5)',   // slate
    orb2: 'rgba(51,65,85,0.4)',
    orb3: 'rgba(30,41,59,0.5)',
    overlay: 'rgba(0,0,0,0.2)',
    accent: '#94a3b8',
    accentGlow: 'rgba(148,163,184,0.3)',
    border: 'rgba(148,163,184,0.2)',
    gradientBg: 'radial-gradient(ellipse at 50% 50%, rgba(15,23,42,0.5) 0%, transparent 70%)',
    badge: { bg: 'rgba(100,116,139,0.15)', border: 'rgba(148,163,184,0.3)', text: '#cbd5e1' },
  },
  Energetic: {
    orb1: 'rgba(249,115,22,0.55)',  // orange
    orb2: 'rgba(251,146,60,0.4)',
    orb3: 'rgba(234,88,12,0.35)',
    overlay: 'rgba(120,40,0,0.1)',
    accent: '#fb923c',
    accentGlow: 'rgba(249,115,22,0.5)',
    border: 'rgba(249,115,22,0.3)',
    gradientBg: 'radial-gradient(ellipse at 80% 20%, rgba(120,40,0,0.3) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(234,88,12,0.2) 0%, transparent 55%)',
    badge: { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.4)', text: '#fed7aa' },
  },
  Peaceful: {
    orb1: 'rgba(52,211,153,0.45)',  // emerald
    orb2: 'rgba(110,231,183,0.35)',
    orb3: 'rgba(16,185,129,0.3)',
    overlay: 'rgba(0,60,40,0.1)',
    accent: '#34d399',
    accentGlow: 'rgba(52,211,153,0.45)',
    border: 'rgba(52,211,153,0.3)',
    gradientBg: 'radial-gradient(ellipse at 10% 80%, rgba(0,60,40,0.3) 0%, transparent 60%), radial-gradient(ellipse at 90% 20%, rgba(16,185,129,0.18) 0%, transparent 55%)',
    badge: { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.35)', text: '#6ee7b7' },
  },
  Thoughtful: {
    orb1: 'rgba(167,139,250,0.45)',  // violet
    orb2: 'rgba(196,181,253,0.35)',
    orb3: 'rgba(139,92,246,0.3)',
    overlay: 'rgba(60,20,120,0.1)',
    accent: '#a78bfa',
    accentGlow: 'rgba(167,139,250,0.45)',
    border: 'rgba(167,139,250,0.3)',
    gradientBg: 'radial-gradient(ellipse at 20% 70%, rgba(60,20,120,0.25) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(139,92,246,0.18) 0%, transparent 55%)',
    badge: { bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.4)', text: '#c4b5fd' },
  },
  Romantic: {
    orb1: 'rgba(244,114,182,0.5)',  // pink
    orb2: 'rgba(249,168,212,0.4)',
    orb3: 'rgba(236,72,153,0.3)',
    overlay: 'rgba(100,10,60,0.12)',
    accent: '#f472b6',
    accentGlow: 'rgba(244,114,182,0.5)',
    border: 'rgba(244,114,182,0.3)',
    gradientBg: 'radial-gradient(ellipse at 70% 10%, rgba(100,10,60,0.3) 0%, transparent 55%), radial-gradient(ellipse at 30% 90%, rgba(236,72,153,0.2) 0%, transparent 55%)',
    badge: { bg: 'rgba(244,114,182,0.15)', border: 'rgba(244,114,182,0.4)', text: '#fbcfe8' },
  },
  Mysterious: {
    orb1: 'rgba(139,92,246,0.5)',  // purple
    orb2: 'rgba(109,40,217,0.35)',
    orb3: 'rgba(76,29,149,0.3)',
    overlay: 'rgba(30,0,70,0.15)',
    accent: '#8b5cf6',
    accentGlow: 'rgba(139,92,246,0.45)',
    border: 'rgba(139,92,246,0.3)',
    gradientBg: 'radial-gradient(ellipse at 50% 0%, rgba(30,0,70,0.4) 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(76,29,149,0.25) 0%, transparent 55%)',
    badge: { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)', text: '#ddd6fe' },
  },
};

const defaultTheme = {
  orb1: 'rgba(167,139,250,0.15)',
  orb2: 'rgba(236,72,153,0.1)',
  orb3: 'rgba(59,130,246,0.1)',
  overlay: 'rgba(0,0,0,0)',
  accent: 'var(--theme-primary)',
  accentGlow: 'rgba(167,139,250,0.2)',
  border: 'rgba(167,139,250,0.2)',
  gradientBg: '',
  badge: { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)', text: '#c4b5fd' },
};
// --- Animated Background (Memoized to prevent typing lag) ---
const AnimatedBackground = React.memo(({ activeTab, theme }: { activeTab: string, theme: any }) => {
  return (
    <AnimatePresence>
      {activeTab === "poem" && (
        <>
          <motion.div
            className="reactive-bg"
            animate={{ background: theme.gradientBg || 'radial-gradient(circle, transparent, transparent)' }}
            transition={{ duration: 2.5, ease: 'easeInOut' }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="reactive-overlay"
            animate={{ background: theme.overlay }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            exit={{ opacity: 0 }}
          />
          <div className="orb-bg">
            <motion.div className="orb orb-1" animate={{ background: `radial-gradient(circle, ${theme.orb1}, transparent 70%)` }} transition={{ duration: 2 }} />
            <motion.div className="orb orb-2" animate={{ background: `radial-gradient(circle, ${theme.orb2}, transparent 70%)` }} transition={{ duration: 2.2 }} />
            <motion.div className="orb orb-3" animate={{ background: `radial-gradient(circle, ${theme.orb3}, transparent 70%)` }} transition={{ duration: 1.8 }} />
          </div>
        </>
      )}
    </AnimatePresence>
  );
});

export function WritePost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // VerseVibe AI States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [theme, setTheme] = useState(defaultTheme);
  const [activeTab, setActiveTab] = useState("poem");

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

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem("smileArtist_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.content) setContent(parsed.content);
        if (parsed.selectedCategories) setSelectedCategories(parsed.selectedCategories);
      } catch { /* ignore corrupted drafts */ }
    }
  }, []);

  const handleSaveDraft = () => {
    localStorage.setItem(
      "smileArtist_draft",
      JSON.stringify({ title, content, selectedCategories })
    );
    toast.success("Draft saved! ✏️");
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

      const { error } = await supabase.from("posts").insert([
        {
          title: title.trim() || (type === 'unsent_letter' ? 'Unsent Letter' : 'Untitled'),
          content: content.trim(),
          category: selectedCategories[0] || 'General',
          categories: selectedCategories,
          type: type,
          user_id: user.id,
          created_at: new Date().toISOString(),
        },
      ]);


      if (error) throw error;

      // Clear draft after successful publish
      localStorage.removeItem("smileArtist_draft");
      toast.success("Post published successfully!");
      setTitle("");
      setContent("");
      setSelectedCategories([]);
      setAnalysisResult(null);
      setTheme(defaultTheme);
    } catch (error: any) {
      console.error("Error publishing post:", error);
      toast.error(error.message || "Failed to publish post.");
    } finally {
      setIsPublishing(false);
    }
  };

  // VerseVibe AI Analysis handler
  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast.error('Please write some poetry first ✨');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze');
      }

      const rawData = data.analysis;
      const jsonMatch = rawData.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setAnalysisResult(parsed);
        toast.success(`TalkingBuddy detected: ${parsed.sentiment} ✨`);

        // Update Theme
        if (parsed.sentiment && sentimentThemes[parsed.sentiment]) {
          setTheme(sentimentThemes[parsed.sentiment]);
        }
      } else {
        throw new Error("Could not parse AI response");
      }
    } catch (error: any) {
      console.error('VerseVibe AI Error:', error);
      toast.error(error.message || 'AI Backend unreachable. Ensure the concurrent server is running on port 8000.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto verse-vibe-container relative">
      <AnimatedBackground activeTab={activeTab} theme={theme} />

      <div className="relative z-10 p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md"
              style={{ backgroundColor: `${theme.accent}20` }}
            >
              <PenTool className="w-6 h-6" style={{ color: theme.accent }} />
            </div>
            <h1 style={{ color: 'var(--theme-text)' }}>Write Your Heart</h1>
          </div>
          <p style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
            Share your thoughts, poems, and stories with the world
          </p>
        </div>

        <Tabs defaultValue="poem" className="mb-6" onValueChange={setActiveTab}>
          <TabsList
            className="grid grid-cols-2 md:flex w-full h-auto md:h-11 gap-2 mb-6 rounded-xl shadow-md p-1 border border-[var(--theme-primary)]/10"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            <TabsTrigger value="poem" className="rounded-xl transition-all whitespace-nowrap px-4 py-2 h-9 md:h-full data-[state=active]:bg-[var(--theme-background)] data-[state=active]:shadow-sm">
              <Type className="w-4 h-4 mr-2" />
              Poem
            </TabsTrigger>
            <TabsTrigger value="story" className="rounded-xl transition-all whitespace-nowrap px-4 py-2 h-9 md:h-full data-[state=active]:bg-[var(--theme-background)] data-[state=active]:shadow-sm">
              <PenTool className="w-4 h-4 mr-2" />
              Story
            </TabsTrigger>
            <TabsTrigger value="article" className="rounded-xl transition-all whitespace-nowrap px-4 py-2 h-9 md:h-full data-[state=active]:bg-[var(--theme-background)] data-[state=active]:shadow-sm">
              <FileText className="w-4 h-4 mr-2" />
              Article
            </TabsTrigger>
            <TabsTrigger value="unsent_letter" className="rounded-xl transition-all whitespace-nowrap px-4 py-2 h-9 md:h-full data-[state=active]:bg-[var(--theme-background)] data-[state=active]:shadow-sm">
              <Mail className="w-4 h-4 mr-2" />
              Unsent Letter
            </TabsTrigger>
          </TabsList>

          {/* POEM VIEW with VerseVibe AI Integration */}
          <TabsContent value="poem">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,350px] gap-6 items-start">
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
                handleSaveDraft={handleSaveDraft}
                isPublishing={isPublishing}
                placeholder="Let your emotions flow through verses..."
                titlePlaceholder="Your Poem's Title"
                theme={theme}
                isPoemView={true}
                handleAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
              {/* VerseVibe Sidebar Panel */}
              <div className="sticky top-24">
                <AnalysisPanel
                  loading={isAnalyzing}
                  result={analysisResult}
                  theme={theme}
                />
              </div>
            </div>
          </TabsContent>

          {/* Standard Views (No AI Sidebar) */}
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
              handleSaveDraft={handleSaveDraft}
              isPublishing={isPublishing}
              placeholder="Tell your story in prose..."
              titlePlaceholder="Your Story's Title"
            />
          </TabsContent>

          <TabsContent value="article">
            <WriteForm
              title={title}
              setTitle={setTitle}
              content={content}
              setContent={setContent}
              selectedCategories={selectedCategories}
              handleRemoveCategory={handleRemoveCategory}
              suggestedCategories={suggestedCategories}
              handleAddCategory={handleAddCategory}
              handlePublish={() => handlePublish("article")}
              handleSaveDraft={handleSaveDraft}
              isPublishing={isPublishing}
              placeholder="Share your thoughts and ideas..."
              titlePlaceholder="Your Article's Title"
            />
          </TabsContent>

          <TabsContent value="unsent_letter">
            <WriteForm
              title={title}
              setTitle={setTitle}
              content={content}
              setContent={setContent}
              selectedCategories={selectedCategories}
              handleRemoveCategory={handleRemoveCategory}
              suggestedCategories={suggestedCategories}
              handleAddCategory={handleAddCategory}
              handlePublish={() => handlePublish("unsent_letter")}
              handleSaveDraft={handleSaveDraft}
              isPublishing={isPublishing}
              placeholder="Write the words you never sent..."
              titlePlaceholder="Dear..."
            />
          </TabsContent>
        </Tabs>
      </div>
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
  handleSaveDraft: () => void;
  placeholder: string;
  titlePlaceholder: string;
  isPublishing: boolean;
  theme?: any;
  isPoemView?: boolean;
  handleAnalyze?: () => void;
  isAnalyzing?: boolean;
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
  handleSaveDraft,
  placeholder,
  titlePlaceholder,
  isPublishing,
  theme,
  isPoemView = false,
  handleAnalyze,
  isAnalyzing = false,
}: WriteFormProps) {
  const accentColor = theme?.accent || 'var(--theme-primary)';
  const borderColor = theme?.border || `1px solid var(--theme-primary)33`;

  return (
    <div className="space-y-6">
      {/* Title Input */}
      <motion.div
        className="p-6 rounded-2xl shadow-md border"
        animate={{
          backgroundColor: isPoemView ? 'color-mix(in srgb, var(--theme-card-bg) 50%, transparent)' : 'var(--theme-card-bg)',
          borderColor: isPoemView ? (isAnalyzing ? accentColor : borderColor) : `var(--theme-primary)33`,
        }}
        style={{ backdropFilter: isPoemView ? 'blur(12px)' : 'none' }}
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
      </motion.div>

      {/* Content Textarea */}
      <motion.div
        className="p-6 rounded-2xl shadow-md border"
        animate={{
          backgroundColor: isPoemView ? 'color-mix(in srgb, var(--theme-card-bg) 50%, transparent)' : 'var(--theme-card-bg)',
          borderColor: isPoemView ? (isAnalyzing ? accentColor : borderColor) : `var(--theme-primary)33`,
        }}
        style={{ backdropFilter: isPoemView ? 'blur(12px)' : 'none' }}
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
        <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <span
            className="text-sm"
            style={{ color: 'var(--theme-text)', opacity: 0.5 }}
          >
            {content.length} characters
          </span>

          {/* VerseVibe Analyze Button (Only visible in Poem view) */}
          {isPoemView && handleAnalyze && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all text-white shadow-md font-medium"
              style={{
                background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`,
                opacity: isAnalyzing ? 0.7 : 1
              }}
            >
              <Sparkles className="w-4 h-4" />
              {isAnalyzing ? "Reading..." : "Analyze Sentiment"}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Categories */}
      <motion.div
        className="p-6 rounded-2xl shadow-md border"
        animate={{
          backgroundColor: isPoemView ? 'color-mix(in srgb, var(--theme-card-bg) 50%, transparent)' : 'var(--theme-card-bg)',
          borderColor: isPoemView ? borderColor : `var(--theme-primary)33`,
        }}
        style={{ backdropFilter: isPoemView ? 'blur(12px)' : 'none' }}
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
                className="px-3 py-1 flex items-center gap-2 cursor-pointer transition-colors"
                style={{
                  backgroundColor: isPoemView ? accentColor : 'var(--theme-primary)',
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
                  ? `${isPoemView ? accentColor : 'var(--theme-primary)'}33`
                  : 'var(--theme-accent)',
                color: isPoemView ? accentColor : 'var(--theme-primary)',
                border: `1px solid ${selectedCategories.includes(cat) ? (isPoemView ? accentColor : 'var(--theme-primary)') : 'transparent'}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          className="rounded-xl transition-colors"
          style={{
            borderColor: isPoemView ? accentColor : 'var(--theme-primary)',
            color: isPoemView ? accentColor : 'var(--theme-primary)',
          }}
          onClick={handleSaveDraft}
        >
          Save Draft
        </Button>
        <Button
          className="rounded-xl text-white shadow-md transition-all"
          style={{
            background: isPoemView ? accentColor : `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`,
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
