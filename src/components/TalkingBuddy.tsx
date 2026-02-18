import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Heart, MessageCircle, Send, UserPlus, X, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { useTheme } from "../utils/ThemeContext";
import { supabase } from "../utils/supabaseClient";

// ✅ FIXED IMPORT: Now pointing to the correct file name
import { 
  findBuddyMatch, 
  sendBuddyMessage, 
  sendBuddyRequest, 
  acceptBuddyRequest, 
  cancelMatchmaking 
} from "../utils/supabaseQueries"; 

type UserRole = "listener" | "seeker" | null;
type ConnectionStatus = "idle" | "waiting" | "connected" | "ended";

interface Message {
  id: string;
  text: string;
  sender: "me" | "other";
  senderId: string;
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

  // Buddy/Friend Logic State
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [friendRequestReceived, setFriendRequestReceived] = useState(false);
  const [friendsAdded, setFriendsAdded] = useState(false);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  
  // Refs for subscriptions and scrolling
  const chatChannelRef = useRef<any>(null);
  const matchChannelRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Initialize User
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUserId();
  }, []);

  // 2. LOGIC: WAITING (Realtime Match Listener + Polling Fallback)
  // If we are in the queue, we listen for when we get added to 'chat_participants'
  useEffect(() => {
    if (!userId || status !== 'waiting') return;

    let isMatched = false;

    // --- Realtime Listener ---
    matchChannelRef.current = supabase
      .channel(`participant_tracker:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_participants",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (isMatched) return;
          isMatched = true;
          // We have been paired!
          const newChatId = payload.new.chat_id;
          await handleMatchFound(newChatId);
        }
      )
      .subscribe();

    // --- Polling Fallback (every 3 seconds) ---
    // Catches cases where Realtime event is missed or Realtime is not enabled on chat_participants.
    // We join with chats to only pick up fresh buddy-type chats, not old/regular chats.
    const pollInterval = setInterval(async () => {
      if (isMatched) return;
      try {
        const { data, error } = await supabase
          .from("chat_participants")
          .select("chat_id, chats!inner(id, type, status)")
          .eq("user_id", userId)
          .eq("chats.type", "buddy")
          .eq("chats.status", "temporary")
          .limit(1);

        if (!error && data && data.length > 0) {
          isMatched = true;
          clearInterval(pollInterval);
          await handleMatchFound(data[0].chat_id);
        }
      } catch (e) {
        // silently ignore poll errors
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      if (matchChannelRef.current) supabase.removeChannel(matchChannelRef.current);
    };
  }, [userId, status]);

  // 3. LOGIC: CONNECTED (Chatting & Requests)
  useEffect(() => {
    if (!userId || status !== "connected" || !sessionId) return;

    chatChannelRef.current = supabase
      .channel(`active_chat:${sessionId}`)
      // A. Listen for Messages
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id !== userId) {
            setMessages((prev) => [
              ...prev,
              {
                id: newMsg.id,
                text: newMsg.content,
                sender: "other",
                senderId: newMsg.sender_id,
                timestamp: new Date(newMsg.created_at).getTime(),
              },
            ]);
          }
        }
      )
      // B. Listen for Buddy Requests (Incoming)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "buddy_requests",
          filter: `to_user=eq.${userId}`, 
        },
        (payload) => {
           if (payload.new.chat_id === sessionId && payload.new.status === 'pending') {
               setFriendRequestReceived(true);
           }
        }
      )
      // C. Listen for Updates (Accepted/Declined requests)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "buddy_requests",
          filter: `from_user=eq.${userId}`, // I sent the request
        },
        (payload) => {
           if (payload.new.status === 'accepted') {
               setFriendsAdded(true);
               setMessages((prev) => [...prev, { id: `sys_acc_${Date.now()}`, text: "🎉 Connection request accepted! Chat saved.", sender: "other", senderId: "system", timestamp: Date.now() }]);
           } else if (payload.new.status === 'declined') {
               setMessages((prev) => [...prev, { id: `sys_dec_${Date.now()}`, text: "Request declined.", sender: "other", senderId: "system", timestamp: Date.now() }]);
               setFriendRequestSent(false); 
           }
        }
      )
      .subscribe();

    return () => {
      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
    };
  }, [userId, status, sessionId]);


  // HELPER: Fetch other participant details when match is found
  const handleMatchFound = async (chatId: string) => {
      // Fetch the OTHER participant ID
      const { data: participants, error } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId)
        .neq('user_id', userId); 

      if (error || !participants || participants.length === 0) {
          console.error("Match found but could not identify partner");
          return;
      }

      setOtherUserId(participants[0].user_id);
      setSessionId(chatId);
      setStatus("connected");
      
      // Cleanup Queue (Best effort)
      if(userId) {
          try { await cancelMatchmaking(userId); } catch(e) { /* ignore if already gone */ }
      }

      // System Welcome Message
      setMessages([{
        id: `welcome_${Date.now()}`,
        text: role === "seeker" 
            ? "You are now connected with a Listener. This is a safe space." 
            : "You are now connected with a Seeker. Please listen with empathy.",
        sender: "other",
        senderId: "system",
        timestamp: Date.now(),
      }]);
  };

  // ACTION: Start Queue
  const startConnection = async (selectedRole: UserRole) => {
    if (!userId || !selectedRole) {
      setError("You must be logged in.");
      return;
    }
    setError(null);
    setRole(selectedRole);
    setStatus("waiting");
    setMessages([]);
    setFriendRequestSent(false);
    setFriendsAdded(false);
    setFriendRequestReceived(false);

    try {
        // 1. Try to find an immediate match using your RPC query
        const matchId = await findBuddyMatch(userId, selectedRole);
        
        // 2. If the RPC returns a chat_id immediately
        if (matchId) {
            await handleMatchFound(matchId);
        } else {
            // 3. If no immediate match, insert into queue and wait
            const { error: queueError } = await supabase
                .from("matchmaking_queue")
                .upsert({ user_id: userId, role: selectedRole });

            if (queueError) throw queueError;
        }

    } catch (err: any) {
        console.error("Queue Error:", err);
        setError("Failed to join waiting room.");
        setStatus("idle");
    }
  };

  // ACTION: Send Message
  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || !userId) return;

    const textToSend = inputMessage;
    setInputMessage(""); // Optimistic clear

    // Optimistic UI
    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      text: textToSend,
      sender: "me",
      senderId: userId,
      timestamp: Date.now(),
    }]);

    try {
        await sendBuddyMessage(sessionId, userId, textToSend);
    } catch (err) {
        console.error("Message failed");
    }
  };

  // ACTION: Friend/Buddy Requests
  const sendFriendReq = async () => {
    if (!userId || !otherUserId || !sessionId) return;
    setFriendRequestSent(true);

    try {
        await sendBuddyRequest(sessionId, userId, otherUserId);
    } catch (err) {
        setFriendRequestSent(false);
        setError("Could not send request.");
    }
  };

  const acceptFriendReq = async () => {
    if (!userId || !otherUserId || !sessionId) return;

    try {
        await acceptBuddyRequest(sessionId, userId, otherUserId);
        setFriendsAdded(true);
        setFriendRequestReceived(false);
    } catch (err) {
        console.error("Accept Error", err);
        setError("Failed to accept request.");
    }
  };

  const declineFriendReq = async () => {
    if (!userId || !sessionId) return;
    setFriendRequestReceived(false);
    
    // Direct Supabase call for decline (simple update)
    await supabase
        .from("buddy_requests")
        .update({ status: 'declined' })
        .eq('chat_id', sessionId)
        .eq('to_user', userId);
  };

  // ACTION: End Connection
  const endConnection = async () => {
    if (status === "waiting" && userId) {
        try {
            await cancelMatchmaking(userId);
        } catch (e) { console.error(e); }
        
        setStatus("idle");
        setRole(null);
    } else if (status === "connected") {
        // Soft end: allow user to stay on screen to add friend
        setStatus("ended");
        setMessages(prev => [...prev, { 
            id: 'sys_end', 
            text: "Chat ended. You can now send a connection request or exit.", 
            sender: 'other', 
            senderId: 'system', 
            timestamp: Date.now() 
        }]);
    } else {
        // Hard Reset
        setStatus("idle");
        setRole(null);
        setSessionId(null);
        setMessages([]);
        setInputMessage("");
        setFriendRequestSent(false);
        setFriendRequestReceived(false);
        setFriendsAdded(false);
        setOtherUserId(null);
    }
  };

  // --- RENDER ---

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
            <Button onClick={() => startConnection("listener")} className="w-full shadow-md rounded-xl" style={{ background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`, color: 'white' }} >
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
            <Button onClick={() => startConnection("seeker")} className="w-full shadow-md rounded-xl" style={{ background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`, color: 'white' }} >
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

  // WAITING STATE
  if (status === "waiting") {
      return (
        <div className="max-w-4xl mx-auto flex items-center justify-center h-[50vh]">
            <Card className="p-8 text-center border-none shadow-none bg-transparent">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: 'var(--theme-primary)' }} />
                <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                    Finding a {role === 'listener' ? 'Seeker' : 'Listener'}...
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
                    Please wait while we pair you with someone.
                </p>
                <Button onClick={() => endConnection()} variant="outline">
                    Cancel
                </Button>
            </Card>
        </div>
      );
  }

  // ACTIVE CHAT / ENDED STATE
  return (
    <div className="max-w-4xl mx-auto md:pt-0 -mt-16 md:mt-0 -mx-4 md:mx-auto h-screen md:h-auto">
      <Card className="border backdrop-blur-sm md:rounded-2xl shadow-lg overflow-hidden h-full md:h-auto flex flex-col" style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-card-bg)', opacity: 1 }}>
        
        {/* Header */}
        <div className="border-b p-3 md:p-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--theme-primary)', background: 'var(--theme-accent)' }}>
          <div className="flex items-center gap-2 md:gap-3">
            <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${status === 'connected' ? 'animate-pulse bg-[var(--theme-primary)]' : 'bg-gray-400'}`}></div>
            <div>
              <h3 className="text-sm md:text-base" style={{ color: 'var(--theme-text)' }}>
                {status === 'ended' ? "Chat Ended" : (role === "listener" ? "Supporting Someone" : "Talking with a Listener")}
              </h3>
              <p className="text-xs md:text-sm" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
                {status === 'ended' ? "Decide what's next" : "Anonymous conversation"}
              </p>
            </div>
          </div>
          <Button onClick={endConnection} variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 hover:bg-[var(--theme-accent)]" style={{ color: 'var(--theme-primary)' }} >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4" style={{ backgroundColor: 'var(--theme-background)' }}>
          {messages.length === 0 && (
            <div className="text-center py-8 md:py-12">
              <MessageCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3" style={{ color: 'var(--theme-primary)', opacity: 0.3 }} />
              <p className="text-sm md:text-base" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>Start the conversation...</p>
            </div>
          )}
          
          {messages.map((message) => {
            const isMe = message.sender === "me";
            const isSystem = message.senderId === "system";
            const bubbleRadius = theme.chatBubbleStyle === "square" ? "0.25rem" : theme.chatBubbleStyle === "bubble" ? "1.5rem" : theme.borderRadius;
            const bubbleClass = theme.chatBubbleStyle === "bubble" ? (isMe ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm") : "";
            
            if (isSystem) {
                return (
                    <div key={message.id} className="flex justify-center my-2">
                        <span className="text-xs py-1 px-3 rounded-full bg-[var(--theme-accent)] text-[var(--theme-text)] opacity-70">
                            {message.text}
                        </span>
                    </div>
                )
            }

            return (
              <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`} >
                <div className={`max-w-[80%] md:max-w-[70%] px-3 py-2 md:px-4 md:py-3 shadow-sm ${bubbleClass}`} style={{ backgroundColor: isMe ? theme.chatMyMessageBg : theme.chatOtherMessageBg, color: isMe ? "white" : theme.textColor, borderRadius: theme.chatBubbleStyle === "bubble" ? undefined : bubbleRadius, border: !isMe ? `1px solid ${theme.primaryColor}20` : "none", }} >
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
              <span>Partner wants to stay connected!</span>
              <div className="flex gap-2 ml-2">
                <Button onClick={acceptFriendReq} size="sm" className="rounded-lg h-7 text-xs text-white hover:opacity-90" style={{ backgroundColor: 'var(--theme-primary)' }} >
                  Accept
                </Button>
                <Button onClick={declineFriendReq} size="sm" variant="outline" className="rounded-lg h-7 text-xs border hover:bg-[var(--theme-accent)]" style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)', backgroundColor: 'transparent' }} >
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

        {/* Request Trigger Button */}
        {!friendsAdded && !friendRequestSent && (
          <div className="px-4 pb-3">
            <Button 
                onClick={sendFriendReq} 
                variant="outline" 
                size="sm" 
                className="w-full rounded-xl hover:bg-[var(--theme-accent)]" 
                style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)', backgroundColor: 'transparent' }} 
            >
              <UserPlus className="w-4 h-4 mr-2" /> 
              {status === 'ended' ? "Save Chat & Add Buddy" : "Save Chat & Stay Connected"}
            </Button>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t p-3 md:p-4 flex-shrink-0" style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-accent)' }}>
          <div className="flex gap-2">
            <Input 
                type="text" 
                placeholder={status === 'ended' ? "Chat ended." : "Type your message..."} 
                value={inputMessage} 
                disabled={status === 'ended'}
                onChange={(e) => setInputMessage(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 text-sm md:text-base rounded-xl" 
                style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-text)' }} 
            />
            <Button 
                onClick={sendMessage} 
                disabled={status === 'ended'}
                className="h-9 w-9 md:h-10 md:w-10 rounded-xl shadow-md" 
                style={{ background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`, color: 'white' }}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}