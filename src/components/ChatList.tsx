import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MessageCircle, Heart } from "lucide-react";
import { supabase } from "../utils/supabaseClient";

export function ChatList() {
  const [savedChats, setSavedChats] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h2 className="mb-2" style={{ color: 'var(--theme-text)' }}>My Saved Chats</h2>
        <p className="text-sm md:text-base" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
          Continue conversations with your support buddies
        </p>
      </div>

      <Card className="p-12 text-center backdrop-blur-sm rounded-2xl border" style={{ backgroundColor: 'var(--theme-card-bg)', opacity: 0.9, borderColor: 'var(--theme-primary)' }}>
        <Heart className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--theme-primary)', opacity: 0.3 }} />
        <h3 className="mb-2" style={{ color: 'var(--theme-text)' }}>No saved chats yet</h3>
        <p className="text-sm md:text-base" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
          When you connect with someone through Talking Buddy and both agree to stay connected,
          your conversation will appear here.
        </p>
      </Card>
    </div>
  );
}
