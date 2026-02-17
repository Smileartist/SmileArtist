import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { MessageCircle, Heart } from "lucide-react";
import { supabase } from "../utils/supabaseClient";

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
}

interface ChatParticipant {
  user_id: string;
}

interface ProfileData {
  full_name: string;
  username: string;
  avatar_url: string;
}

interface Chat {
  id: string;
  created_at: string;
  last_message_at: string | null;
  messages: ChatMessage[];
  chat_participants: ChatParticipant[];
}

interface FormattedChat extends Chat {
  otherParticipant: ProfileData | null;
  lastMessage: ChatMessage | null;
}

export function ChatList() {
  const [chats, setChats] = useState<FormattedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserIdAndFetchChats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchChats(user.id);
      } else {
        setLoading(false);
      }
    };
    getUserIdAndFetchChats();
  }, []);

  const fetchChats = async (currentUserId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_participants")
        .select(
          `
          chats (
            id,
            created_at,
            last_message_at,
            messages (id, content, created_at, sender_id),
            chat_participants (user_id)
          )
        `
        )
        .eq("user_id", currentUserId);

      if (error) throw error;

      const rawChats = (data || []).map((cp: any) => cp.chats as Chat);
      const validChats = rawChats.filter(chat => chat !== null && chat.chat_participants.length > 1);

      const formattedChatsPromises = validChats.map(async chat => {
        const otherParticipant = chat.chat_participants.find(
          (p: any) => p.user_id !== currentUserId
        );
        const lastMessage = chat.messages.length > 0 
          ? chat.messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : null;
        
        let otherProfile: ProfileData | null = null;
        if (otherParticipant?.user_id) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("full_name, username, avatar_url")
            .eq("id", otherParticipant.user_id)
            .single();

          if (profileError) {
            console.error("Error fetching other participant profile:", profileError);
          } else {
            otherProfile = profileData;
          }
        }

        return {
          ...chat,
          otherParticipant: otherProfile,
          lastMessage: lastMessage,
        };
      });

      const formattedChats = await Promise.all(formattedChatsPromises);

      setChats(formattedChats.sort((a, b) => {
        const dateA = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.created_at).getTime();
        const dateB = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.created_at).getTime();
        return dateB - dateA; 
      }));

    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p style={{ color: "var(--theme-text)", opacity: 0.6 }}>Loading chats...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h2 className="mb-2" style={{ color: 'var(--theme-text)' }}>My Chats</h2>
        <p className="text-sm md:text-base" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
          Continue conversations with your support buddies
        </p>
      </div>

      {chats.length > 0 ? (
        <div className="space-y-4">
          {chats.map((chat) => ( 
            <Card key={chat.id} className="p-4 md:p-6 flex items-center gap-4 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow" style={{ backgroundColor: 'var(--theme-card-bg)', border: `1px solid var(--theme-primary)33` }}>
              <Avatar className="w-12 h-12">
                <AvatarImage src={chat.otherParticipant?.avatar_url} />
                <AvatarFallback>{chat.otherParticipant?.full_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-bold" style={{ color: 'var(--theme-text)' }}>{chat.otherParticipant?.full_name}</p>
                <p className="text-sm opacity-70" style={{ color: 'var(--theme-text)' }}>
                  {chat.lastMessage?.content || "No messages yet."}
                </p>
              </div>
              <span className="text-xs opacity-50" style={{ color: 'var(--theme-text)' }}>
                {chat.lastMessage ? new Date(chat.lastMessage.created_at).toLocaleDateString() : new Date(chat.created_at).toLocaleDateString()}
              </span>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center backdrop-blur-sm rounded-2xl border" style={{ backgroundColor: 'var(--theme-card-bg)', opacity: 0.9, borderColor: 'var(--theme-primary)' }}>
          <MessageCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--theme-primary)', opacity: 0.3 }} />
          <h3 className="mb-2" style={{ color: 'var(--theme-text)' }}>No chats yet</h3>
          <p className="text-sm md:text-base" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
            When you connect with someone through Talking Buddy and both agree to stay connected,
            your conversation will appear here.
          </p>
        </Card>
      )}
    </div>
  );
}
