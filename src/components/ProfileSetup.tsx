import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { supabase } from "../utils/supabaseClient";
import { toast } from "sonner";
import { User, MapPin, Sparkles } from "lucide-react";

interface ProfileSetupProps {
  userId: string;
  onComplete: () => void;
}

export function ProfileSetup({ userId, onComplete }: ProfileSetupProps) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      toast.error("Username is required");
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        username: username.toLowerCase(),
        full_name: fullName,
        bio: bio,
        location: location,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Username already taken");
        } else {
          throw error;
        }
      } else {
        toast.success("Profile setup complete!");
        onComplete();
      }
    } catch (error: any) {
      console.error("Error setting up profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--theme-background)] to-[var(--theme-accent)]">
      <Card className="w-full max-w-md p-6 md:p-8 rounded-3xl shadow-xl border-2 border-[var(--theme-primary)]/20 bg-[var(--theme-card-bg)]/90 backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[var(--theme-accent)] flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-[var(--theme-primary)]" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--theme-text)" }}>Complete Your Profile</h1>
          <p className="text-sm opacity-70" style={{ color: "var(--theme-text)" }}>Tell the world a bit about yourself</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--theme-text)" }}>Username *</label>
            <Input
              type="text"
              placeholder="choose_a_unique_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-xl border-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] bg-[var(--theme-card-bg)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--theme-text)" }}>Full Name</label>
            <Input
              type="text"
              placeholder="Your Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-xl border-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] bg-[var(--theme-card-bg)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--theme-text)" }}>Bio</label>
            <Textarea
              placeholder="Share your thoughts, poems, or stories..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="rounded-xl border-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] bg-[var(--theme-card-bg)] resize-none h-24"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--theme-text)" }}>Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" style={{ color: "var(--theme-text)" }} />
              <Input
                type="text"
                placeholder="City, Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10 rounded-xl border-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] bg-[var(--theme-card-bg)]"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl h-11 text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(to right, var(--theme-primary), var(--theme-secondary))",
            }}
          >
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs opacity-60" style={{ color: "var(--theme-text)" }}>
          <Sparkles className="w-3 h-3" />
          <span>You can always update this later in Settings</span>
        </div>
      </Card>
    </div>
  );
}
