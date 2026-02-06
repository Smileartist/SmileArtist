import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Heart, MessageCircle, Send, Users, UserPlus, X, Loader2, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { useTheme } from "../utils/ThemeContext";
import { supabase } from "../utils/supabaseClient";

type UserRole = "listener" | "seeker" | null;
type ConnectionStatus = "idle" | "waiting" | "connected";

interface Message {
  id: string;
  text: string;
  sender: "me" | "other";
  senderId: string;
  timestamp: number;
}

interface FriendRequest {
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "declined";
  timestamp: number;
}

export function TalkingBuddy() {
  const { theme } = useTheme();
  const [role, setRole] = useState<UserRole>(null);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [friendRequestReceived, setFriendRequestReceived] = useState(false);
  const [friendsAdded, setFriendsAdded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null); 
  const matchSubscription = useRef<any>(null);
  const chatSubscription = useRef<any>(null);
  const friendRequestSubscription = useRef<any>(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load session from localStorage and set up real-time listeners
  useEffect(() => {
    if (!userId) return;

    const savedSession = localStorage.getItem(`buddy_session_${userId}`);
    if (savedSession) {
      const session = JSON.parse(savedSession);
      setRole(session.role);
      setStatus(session.status);
      setSessionId(session.sessionId);
      setMessages(session.messages || []);
      setOtherUserId(session.otherUserId);
      setFriendRequestSent(session.friendRequestSent || false);
      setFriendRequestReceived(session.friendRequestReceived || false);
      setFriendsAdded(session.friendsAdded || false);
      setConversationHistory(session.conversationHistory || []);
    }

    // Set up real-time listener for messages in current session
    chatSubscription.current = supabase
      .channel(`chat_session:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const newMessagePayload = payload.new as any; // Use 'any' for the raw payload
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: newMessagePayload.id,
              text: newMessagePayload.text,
              sender: newMessagePayload.sender_id === userId ? "me" : "other", // Determine sender based on ID
              senderId: newMessagePayload.sender_id,
              timestamp: new Date(newMessagePayload.created_at).getTime(),
            } as Message, // Cast to Message after mapping
          ]);
          // saveSession should be updated to use the latest state directly from messages
          // It's safer to update session after the state has been set, or pass a function to saveSession
          // For now, let's keep it simple and assume state updates will eventually be saved
        }
      )
      .subscribe();

    // Set up real-time listener for friend requests
    friendRequestSubscription.current = supabase
      .channel(`friend_requests:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "friend_requests", filter: `to_user_id=eq.${userId}` },
        (payload) => {
          const newRequest = payload.new as FriendRequest;
          if (newRequest.status === "pending") {
            setFriendRequestReceived(true);
            saveSession({ friendRequestReceived: true });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "friend_requests", filter: `from_user_id=eq.${userId}` },
        (payload) => {
          const updatedRequest = payload.new as FriendRequest;
          if (updatedRequest.status === "accepted") {
            setFriendsAdded(true);
            saveSession({ friendsAdded: true });
            // Optionally, add a system message to the chat
            setMessages((prev) => [
              ...prev, 
              { 
                id: `system_${Date.now()}`,
                text: "🎉 Your friend request was accepted!",
                sender: "other", 
                senderId: "system", 
                timestamp: Date.now()
              }
            ]);
          } else if (updatedRequest.status === "declined") {
            setFriendRequestSent(false);
            setFriendRequestReceived(false); // Clear any pending received request if applicable
            saveSession({ friendRequestSent: false, friendRequestReceived: false });
            setMessages((prev) => [
              ...prev, 
              { 
                id: `system_${Date.now()}`,
                text: "Friend request declined.",
                sender: "other", 
                senderId: "system", 
                timestamp: Date.now()
              }
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      chatSubscription.current?.unsubscribe();
      friendRequestSubscription.current?.unsubscribe();
      matchSubscription.current?.unsubscribe(); // Ensure this is also unsubscribed
    };
  }, [userId, sessionId, messages]); // Add messages to dependency array for saveSession in real-time

  // Save session to localStorage
  const saveSession = (data: any) => {
    if (!userId) return;
    const session = {
      role,
      status,
      sessionId,
      messages,
      otherUserId,
      friendRequestSent,
      friendRequestReceived,
      friendsAdded,
      conversationHistory,
      ...data,
    };
    localStorage.setItem(`buddy_session_${userId}`, JSON.stringify(session));
  };

  const startConnection = async (selectedRole: UserRole) => {
    if (!userId) {
      setError("You must be logged in to use Talking Buddy.");
      return;
    }

    setRole(selectedRole);
    setStatus("waiting"); 
    setSessionId(null); 
    setMessages([]);
    setOtherUserId(null); 
    setFriendRequestSent(false);
    setFriendRequestReceived(false);
    setFriendsAdded(false);
    setConversationHistory([]);

    saveSession({ 
      role: selectedRole, 
      status: "waiting", 
      sessionId: null,
      messages: [],
      otherUserId: null,
      friendRequestSent: false,
      friendRequestReceived: false,
      friendsAdded: false,
      conversationHistory: []
    });

    try {
      // 1. Join the matchmaking queue in Supabase
      const { error: joinError } = await supabase
        .from("matchmaking_queue")
        .upsert({ 
          user_id: userId, 
          role: selectedRole,
          status: "waiting"
        });

      if (joinError) throw joinError;

      // 2. Set up real-time listener for matchmaking results
      matchSubscription.current = supabase
        .channel(`matchmaking:${userId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "matchmaking_queue", filter: `user_id=eq.${userId}` },
          async (payload) => {
            const updatedEntry = payload.new as any;
            if (updatedEntry.status === "matched" && updatedEntry.session_id) {
              // Match found!
              const newSessionId = updatedEntry.session_id;
              const partnerId = updatedEntry.partner_id;

              const welcomeMsg: Message = {
                id: `msg_welcome_${Date.now()}`,
                text: selectedRole === "seeker" 
                  ? "You're now connected with an anonymous listener. Feel free to share what's on your mind."
                  : "You're now connected with an anonymous seeker. Listen with empathy and kindness.",
                sender: "other",
                senderId: "system",
                timestamp: Date.now(),
              };

              setSessionId(newSessionId);
              setOtherUserId(partnerId);
              setStatus("connected");
              setMessages([welcomeMsg]);

              saveSession({
                sessionId: newSessionId,
                otherUserId: partnerId,
                status: "connected",
                messages: [welcomeMsg],
              });

              // Cleanup matchmaking listener
              matchSubscription.current?.unsubscribe();
            }
          }
        )
        .subscribe();

    } catch (err: any) {
      console.error("Matchmaking error:", err);
      setError("Failed to join matching queue.");
      setStatus("idle");
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || !userId || !otherUserId) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      text: inputMessage,
      sender: "me",
      senderId: userId,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputMessage("");
    saveSession({ messages: updatedMessages });

    // Send message to Supabase (real-time listeners will pick it up)
    const { error } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        sender_id: userId,
        receiver_id: otherUserId,
        text: inputMessage,
      });

    if (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message.");
    }
  };

  const sendFriendRequest = async () => {
    if (!userId || !otherUserId) return;

    // Send friend request to Supabase (implementation later)
    setFriendRequestSent(true);
    saveSession({ friendRequestSent: true });

    // Simulate friend request reception for now
    setTimeout(() => {
      setFriendRequestReceived(true);
      saveSession({ friendRequestReceived: true });
    }, 2000); // Simulate other user accepting after 2 seconds
  };

  const acceptFriendRequest = async () => {
    if (!userId || !otherUserId) return;
    
    // Accept friend request via Supabase (implementation later)
    setFriendsAdded(true);
    saveSession({ friendsAdded: true });

    // No success message or local storage saving here for now
    // This will be handled by Supabase integration and real-time updates
  };

  const declineFriendRequest = async () => {
    if (!userId || !otherUserId) return;

    // Decline friend request via Supabase (implementation later)
    setFriendRequestReceived(false);
    saveSession({ friendRequestReceived: false });
  };

  const endConnection = () => {
    if (userId) {
      localStorage.removeItem(`buddy_session_${userId}`);
    }
    setRole(null);
    setStatus("idle");
    setSessionId(null);
    setMessages([]);
    setFriendRequestSent(false);
    setFriendRequestReceived(false);
    setFriendsAdded(false);
    setOtherUserId("bot");
  };

  if (status === "idle") {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h2 className="mb-2" style={{ color: 'var(--theme-text)' }}>Talking Buddy</h2>
          <p className="text-sm md:text-base" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
            A safe space to share your thoughts with someone who cares. Connect anonymously for support.
          </p>
        </div>

        {error && (
          <Alert className="mb-6 md:mb-8 border-red-300 bg-red-50 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Alert className="mb-6 md:mb-8 rounded-xl border" style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-accent)' }}>
          <Heart className="h-4 w-4" style={{ color: 'var(--theme-primary)' }} />
          <AlertDescription className="text-sm" style={{ color: 'var(--theme-text)' }}>
            If you're experiencing a crisis, please contact a professional helpline. This is peer support, not professional therapy.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <Card className="p-6 md:p-8 border-2 transition-all backdrop-blur-sm rounded-2xl hover:shadow-lg" style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-card-bg)', opacity: 0.9 }}>
            <div className="flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full mb-4 md:mb-6 mx-auto" style={{ backgroundColor: 'var(--theme-accent)' }}>
              <UserPlus className="w-7 h-7 md:w-8 md:h-8" style={{ color: 'var(--theme-primary)' }} />
            </div>
            <h3 className="text-center mb-2 md:mb-3" style={{ color: 'var(--theme-text)' }}>Be a Listener</h3>
            <p className="text-center text-sm md:text-base mb-4 md:mb-6" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              Offer support and lend an ear to someone who needs it. Your kindness can make a difference.
            </p>
            <Button
              onClick={() => startConnection("listener")}
              className="w-full shadow-md rounded-xl"
              style={{ background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`, color: 'white' }}
            >
              Start Listening
            </Button>
          </Card>

          <Card className="p-6 md:p-8 border-2 transition-all backdrop-blur-sm rounded-2xl hover:shadow-lg" style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-card-bg)', opacity: 0.9 }}>
            <div className="flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full mb-4 md:mb-6 mx-auto" style={{ backgroundColor: 'var(--theme-accent)' }}>
              <MessageCircle className="w-7 h-7 md:w-8 md:h-8" style={{ color: 'var(--theme-primary)' }} />
            </div>
            <h3 className="text-center mb-2 md:mb-3" style={{ color: 'var(--theme-text)' }}>Find a Listener</h3>
            <p className="text-center text-sm md:text-base mb-4 md:mb-6" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              Feeling low or need to talk? Connect with someone who's here to listen without judgment.
            </p>
            <Button
              onClick={() => startConnection("seeker")}
              className="w-full shadow-md rounded-xl"
              style={{ background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`, color: 'white' }}
            >
              Talk to Someone
            </Button>
          </Card>
        </div>

        <div className="mt-6 md:mt-8 p-4 md:p-6 rounded-2xl border" style={{ background: `linear-gradient(to bottom right, var(--theme-accent), var(--theme-accent))`, borderColor: 'var(--theme-primary)' }}>
          <h3 className="mb-3 md:mb-4" style={{ color: 'var(--theme-text)' }}>Guidelines</h3>
          <ul className="space-y-2 text-sm md:text-base" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
            <li className="flex items-start gap-2">
              <span className="mt-1" style={{ color: 'var(--theme-primary)' }}>•</span>
              <span>Be kind, respectful, and non-judgmental</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1" style={{ color: 'var(--theme-primary)' }}>•</span>
              <span>Keep conversations anonymous and confidential</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1" style={{ color: 'var(--theme-primary)' }}>•</span>
              <span>Listen actively and offer support, not advice</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1" style={{ color: 'var(--theme-primary)' }}>•</span>
              <span>Report any concerning behavior or abuse</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  if (status === "waiting") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 md:p-12 text-center backdrop-blur-sm rounded-2xl shadow-lg border" style={{ backgroundColor: 'var(--theme-card-bg)', opacity: 0.9, borderColor: 'var(--theme-primary)' }}>
          <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin mx-auto mb-4 md:mb-6" style={{ color: 'var(--theme-primary)' }} />
          <h3 className="mb-2 md:mb-3" style={{ color: 'var(--theme-text)' }}>
            {role === "listener" ? "Waiting for someone to connect..." : "Finding a listener for you..."}
          </h3>
          <p className="text-sm md:text-base mb-4 md:mb-6" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
            This might take a moment. Thank you for your patience.
          </p>
          <Button 
            onClick={endConnection} 
            variant="outline" 
            className="rounded-xl border hover:bg-[var(--theme-accent)]" 
            style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)', backgroundColor: 'transparent' }}
          >
            Cancel
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto md:pt-0 -mt-16 md:mt-0 -mx-4 md:mx-auto h-screen md:h-auto">
      <Card className="border backdrop-blur-sm md:rounded-2xl shadow-lg overflow-hidden h-full md:h-auto flex flex-col" style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-card-bg)', opacity: 1 }}>
        <div className="border-b p-3 md:p-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--theme-primary)', background: 'var(--theme-accent)' }}>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
            <div>
              <h3 className="text-sm md:text-base" style={{ color: 'var(--theme-text)' }}>
                {role === "listener" ? "Supporting Someone" : "Talking with a Listener"}
              </h3>
              <p className="text-xs md:text-sm" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
                Anonymous conversation
              </p>
            </div>
          </div>
          <Button 
            onClick={endConnection} 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 md:h-10 md:w-10 hover:bg-[var(--theme-accent)]" 
            style={{ color: 'var(--theme-primary)' }}
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4" style={{ backgroundColor: 'var(--theme-background)' }}>
          {messages.length === 0 && (
            <div className="text-center py-8 md:py-12">
              <MessageCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3" style={{ color: 'var(--theme-primary)', opacity: 0.3 }} />
              <p className="text-sm md:text-base" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>Start the conversation...</p>
            </div>
          )}
          {messages.map((message) => {
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
          <div ref={messagesEndRef} />
        </div>

        {/* Friend Request Notifications */}
        {!friendsAdded && friendRequestReceived && (
          <Alert className="mx-4 mb-3 rounded-xl border" style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-accent)' }}>
            <Heart className="h-4 w-4" style={{ color: 'var(--theme-primary)' }} />
            <AlertDescription className="text-sm flex items-center justify-between" style={{ color: 'var(--theme-text)' }}>
              <span>Your chat partner wants to stay connected!</span>
              <div className="flex gap-2 ml-2">
                <Button 
                  onClick={acceptFriendRequest} 
                  size="sm" 
                  className="rounded-lg h-7 text-xs text-white hover:opacity-90" 
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  Accept
                </Button>
                <Button 
                  onClick={declineFriendRequest} 
                  size="sm" 
                  variant="outline" 
                  className="rounded-lg h-7 text-xs border hover:bg-[var(--theme-accent)]" 
                  style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)', backgroundColor: 'transparent' }}
                >
                  Decline
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!friendsAdded && friendRequestSent && (
          <div className="px-4 pb-3">
            <p className="text-xs text-center" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              Friend request sent. Waiting for response...
            </p>
          </div>
        )}

        {!friendsAdded && !friendRequestSent && messages.length > 2 && (
          <div className="px-4 pb-3">
            <Button
              onClick={sendFriendRequest}
              variant="outline"
              size="sm"
              className="w-full rounded-xl hover:bg-[var(--theme-accent)]"
              style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)', backgroundColor: 'transparent' }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Save Chat & Stay Connected
            </Button>
          </div>
        )}

        <div className="border-t p-3 md:p-4 flex-shrink-0" style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-accent)' }}>
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
            <Button onClick={sendMessage} className="h-9 w-9 md:h-10 md:w-10 rounded-xl shadow-md" style={{ background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`, color: 'white' }}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] md:text-xs mt-2" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
            Remember: Be respectful and supportive. This is a safe space for everyone.
          </p>
        </div>
      </Card>
    </div>
  );
}
