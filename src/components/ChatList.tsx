import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
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
  type: string | null;
  status: string | null;
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
            type,
            status,
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
          {chats.map((chat) => {
            const isBuddy = chat.type === 'buddy';
            return (
              <Card
                key={chat.id}
                className="p-4 md:p-6 flex items-center gap-4 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                style={{ backgroundColor: 'var(--theme-card-bg)', border: `1px solid var(--theme-primary)33` }}
              >
                {/* Avatar with heart overlay for buddy chats */}
                <div className="relative flex-shrink-0">
                  <Avatar className="w-12 h-12">
                    <AvatarImage
                      src={chat.otherParticipant?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.otherParticipant?.full_name || 'U')}&background=random`}
                    />
                    <AvatarFallback>
                      {chat.otherParticipant?.full_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {isBuddy && (
                    <span
                      className="absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-white text-xs"
                      style={{ backgroundColor: 'var(--theme-primary)' }}
                    >
                      ❤️
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold truncate" style={{ color: 'var(--theme-text)' }}>
                      {chat.otherParticipant?.full_name || 'Unknown'}
                    </p>
                    {isBuddy && (
                      <Badge
                        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1"
                        style={{ backgroundColor: 'var(--theme-accent)', color: 'var(--theme-primary)', border: `1px solid var(--theme-primary)44` }}
                      >
                        <Heart className="w-2.5 h-2.5" />
                        Buddy
                      </Badge>
                    )}
                  </div>
                  {chat.otherParticipant?.username && (
                    <p className="text-xs mb-1" style={{ color: 'var(--theme-text)', opacity: 0.5 }}>
                      @{chat.otherParticipant.username}
                    </p>
                  )}
                  <p className="text-sm truncate" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
                    {chat.lastMessage?.content || "No messages yet."}
                  </p>
                </div>

                <span className="text-xs opacity-50 flex-shrink-0" style={{ color: 'var(--theme-text)' }}>
                  {chat.lastMessage
                    ? new Date(chat.lastMessage.created_at).toLocaleDateString()
                    : new Date(chat.created_at).toLocaleDateString()}
                </span>
              </Card>
            );
          })}
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
