import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MessageCircle, Send, X, Heart, ArrowLeft } from "lucide-react";
import { useTheme } from "../utils/ThemeContext";

interface Message {
  id: string;
  text: string;
  sender: "me" | "other";
  timestamp: number;
}

interface SavedChat {
  id: string;
  friendId: string;
  messages: Message[];
  lastMessageTime: number;
  preview: string;
}

export function ChatList() {
  const { theme } = useTheme();
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<SavedChat | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [userId] = useState(() => {
    const savedUser = localStorage.getItem("smileArtist_user");
    if (savedUser) {
      return JSON.parse(savedUser).userId;
    }
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });

  useEffect(() => {
    loadSavedChats();
  }, [userId]);

  const loadSavedChats = () => {
    try {
      const chats = JSON.parse(localStorage.getItem(`buddy_saved_chats_${userId}`) || "[]");
      setSavedChats(chats);
    } catch (error) {
      console.error("Error loading saved chats:", error);
      setSavedChats([]);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !selectedChat) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      text: inputMessage,
      sender: "me",
      timestamp: Date.now(),
    };

    // Update selected chat with new message
    const updatedMessages = [...selectedChat.messages, newMessage];
    const updatedChat = {
      ...selectedChat,
      messages: updatedMessages,
      lastMessageTime: Date.now(),
      preview: inputMessage,
    };

    // Update in localStorage
    const allChats = JSON.parse(localStorage.getItem(`buddy_saved_chats_${userId}`) || "[]");
    const chatIndex = allChats.findIndex((c: SavedChat) => c.id === selectedChat.id);
    if (chatIndex !== -1) {
      allChats[chatIndex] = updatedChat;
      localStorage.setItem(`buddy_saved_chats_${userId}`, JSON.stringify(allChats));
    }

    // Update local state
    setSelectedChat(updatedChat);
    setSavedChats(allChats);
    setInputMessage("");

    // Simulate bot response
    setTimeout(() => {
      const responses = [
        "It's good to hear from you again!",
        "I'm glad you're reaching out. How have you been?",
        "Thanks for sharing that with me.",
        "I'm here if you need to talk more.",
        "That sounds interesting. Tell me more.",
      ];

      const botResponse: Message = {
        id: `msg_${Date.now()}_bot`,
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: "other",
        timestamp: Date.now(),
      };

      const newMessages = [...updatedMessages, botResponse];
      const chatWithBotResponse = {
        ...updatedChat,
        messages: newMessages,
        lastMessageTime: Date.now(),
        preview: botResponse.text,
      };

      // Update in localStorage
      const updatedAllChats = JSON.parse(localStorage.getItem(`buddy_saved_chats_${userId}`) || "[]");
      const idx = updatedAllChats.findIndex((c: SavedChat) => c.id === selectedChat.id);
      if (idx !== -1) {
        updatedAllChats[idx] = chatWithBotResponse;
        localStorage.setItem(`buddy_saved_chats_${userId}`, JSON.stringify(updatedAllChats));
      }

      setSelectedChat(chatWithBotResponse);
      setSavedChats(updatedAllChats);
    }, 1500);
  };

  if (selectedChat) {
    return (
      <div className="max-w-4xl mx-auto md:pt-0 -mt-16 md:mt-0 -mx-4 md:mx-auto h-screen md:h-auto">
        <Card className="border backdrop-blur-sm md:rounded-2xl shadow-lg overflow-hidden h-full md:h-auto flex flex-col" style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-card-bg)', opacity: 0.9 }}>
          <div className="border-b p-3 md:p-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--theme-primary)', background: `linear-gradient(to right, var(--theme-accent), var(--theme-accent))`, opacity: 0.3 }}>
            <div className="flex items-center gap-2 md:gap-3">
              <Button
                onClick={() => setSelectedChat(null)}
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:h-10 md:w-10"
                style={{ color: 'var(--theme-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
              <div>
                <h3 className="text-sm md:text-base" style={{ color: 'var(--theme-text)' }}>Your Support Buddy</h3>
                <p className="text-xs md:text-sm" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>Saved conversation</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4" style={{ background: `linear-gradient(to bottom, var(--theme-card-bg), var(--theme-background))`, opacity: 0.5 }}>
            {selectedChat.messages.map((message) => {
              const isMe = message.sender === "me";
              const bubbleRadius = theme.chatBubbleStyle === "square" 
                ? "0.25rem" 
                : theme.chatBubbleStyle === "bubble" 
                  ? "1.5rem" 
                  : theme.borderRadius;
              
              const bubbleClass = theme.chatBubbleStyle === "bubble"
                ? (isMe ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm")
                : "";

              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] md:max-w-[70%] px-3 py-2 md:px-4 md:py-3 shadow-sm ${bubbleClass}`}
                    style={{
                      backgroundColor: isMe ? theme.chatMyMessageBg : theme.chatOtherMessageBg,
                      color: isMe ? "white" : theme.textColor,
                      borderRadius: theme.chatBubbleStyle === "bubble" ? undefined : bubbleRadius,
                      border: !isMe ? `1px solid ${theme.primaryColor}20` : "none",
                    }}
                  >
                    <p className="whitespace-pre-wrap text-sm md:text-base">{message.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t p-3 md:p-4 flex-shrink-0" style={{ borderColor: 'var(--theme-primary)', background: `linear-gradient(to right, var(--theme-accent), var(--theme-accent))`, opacity: 0.3 }}>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 text-sm md:text-base rounded-xl"
                style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-text)' }}
              />
              <Button
                onClick={sendMessage}
                className="h-9 w-9 md:h-10 md:w-10 rounded-xl shadow-md"
                style={{ background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`, color: 'white' }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] md:text-xs mt-2" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              Continue your supportive conversation
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h2 className="mb-2" style={{ color: 'var(--theme-text)' }}>My Saved Chats</h2>
        <p className="text-sm md:text-base" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
          Continue conversations with your support buddies
        </p>
      </div>

      {savedChats.length === 0 ? (
        <Card className="p-12 text-center backdrop-blur-sm rounded-2xl border" style={{ backgroundColor: 'var(--theme-card-bg)', opacity: 0.9, borderColor: 'var(--theme-primary)' }}>
          <Heart className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--theme-primary)', opacity: 0.3 }} />
          <h3 className="mb-2" style={{ color: 'var(--theme-text)' }}>No saved chats yet</h3>
          <p className="text-sm md:text-base" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
            When you connect with someone through Talking Buddy and both agree to stay connected,
            your conversation will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {savedChats.map((chat) => (
            <Card
              key={chat.id}
              className="p-4 md:p-6 border-2 transition-all backdrop-blur-sm rounded-2xl cursor-pointer hover:shadow-md"
              style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-card-bg)', opacity: 0.9 }}
              onClick={() => setSelectedChat(chat)}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--theme-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--theme-primary)'}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-accent)', opacity: 0.8 }}>
                  <MessageCircle className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--theme-primary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 style={{ color: 'var(--theme-text)' }}>Support Buddy</h3>
                    <span className="text-xs" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
                      {new Date(chat.lastMessageTime).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm truncate" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>{chat.preview}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--theme-primary)' }}>
                      {chat.messages.length} messages
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}