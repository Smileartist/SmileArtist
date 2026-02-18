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
  sendBuddyMessageRpc,
  getBuddyMessages,
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
  
  // channel ready flag so we only send broadcast when SUBSCRIBED
  const [channelReady, setChannelReady] = useState(false);

  // Refs for subscriptions and scrolling
  const chatChannelRef = useRef<any>(null);    // Broadcast-only channel (never blocked by RLS)
  const msgChangesRef = useRef<any>(null);     // postgres_changes on messages (separate so failures don't affect Broadcast)
  const matchChannelRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Queue broadcasts sent before the channel is SUBSCRIBED — flushed on SUBSCRIBED
  const pendingBroadcastsRef = useRef<Array<{ type: string; event: string; payload: any }>>([]);
  const channelReadyRef = useRef(false);       // ref mirror of channelReady (no stale-closure)

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

  // 3. LOGIC: CONNECTED — 3 independent delivery paths for maximum reliability:
  //   A. Realtime BROADCAST    — instant, but subject to subscription timing race
  //   B. postgres_changes INSERT on messages — near-real-time (enable Realtime for messages table in Supabase dashboard)
  //   C. DB polling every 2 s  — guaranteed fallback once SQL functions are deployed
  useEffect(() => {
    if (!userId || status !== "connected" || !sessionId) return;

    setChannelReady(false);

    // Helper: merge incoming DB rows into local state (deduplicates by id)
    const mergeDbMessages = (dbRows: Array<{ id: string; sender_id: string; content: string; created_at: string }>) => {
      setMessages((prev) => {
        const existingIds = new Set(
          prev.filter((m) => !m.id.startsWith("temp_") && !m.id.startsWith("welcome_") && !m.id.startsWith("sys_") && !m.id.startsWith("msg_")).map((m) => m.id)
        );
        const newOnes: Message[] = [];
        for (const m of dbRows) {
          if (existingIds.has(m.id)) continue;
          if (m.sender_id === userId) continue; // own messages shown optimistically
          newOnes.push({ id: m.id, text: m.content, sender: "other", senderId: m.sender_id, timestamp: new Date(m.created_at).getTime() });
        }
        if (newOnes.length === 0) return prev;
        setOtherUserId((prevId) => prevId ?? newOnes[0].senderId);
        return [...prev, ...newOnes].sort((a, b) => a.timestamp - b.timestamp);
      });
    };

    // ── Channel A: BROADCAST-ONLY ──────────────────────────────────────────────
    // CRITICAL: Never mix postgres_changes + broadcast on the same channel.
    // If the messages table has RLS enabled, adding postgres_changes to this channel
    // will cause the ENTIRE channel (including Broadcast) to fail to subscribe.
    chatChannelRef.current = supabase
      .channel(`buddy_chat_room:${sessionId}`)
      // 1. Receive partner's new messages instantly
      .on("broadcast", { event: "new_message" }, (payload) => {
        const msg = payload.payload as { id: string; text: string; senderId: string; timestamp: number };
        if (msg.senderId === userId) return;
        setOtherUserId((prev) => prev ?? msg.senderId);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, { id: msg.id, text: msg.text, sender: "other", senderId: msg.senderId, timestamp: msg.timestamp }];
        });
      })
      // 2. Incoming buddy/save request
      .on("broadcast", { event: "buddy_request" }, (payload) => {
        const { fromUser } = payload.payload as { fromUser: string };
        if (fromUser !== userId) {
          setOtherUserId((prev) => prev ?? fromUser);
          setFriendRequestReceived(true);
        }
      })
      // 3. Buddy request response (accepted/declined)
      .on("broadcast", { event: "buddy_response" }, (payload) => {
        const { responseStatus } = payload.payload as { responseStatus: string };
        if (responseStatus === "accepted") {
          setFriendsAdded(true);
          setMessages((prev) => [...prev, { id: `sys_acc_${Date.now()}`, text: "🎉 Connection request accepted! Chat saved.", sender: "other", senderId: "system", timestamp: Date.now() }]);
        } else if (responseStatus === "declined") {
          setMessages((prev) => [...prev, { id: `sys_dec_${Date.now()}`, text: "Request declined.", sender: "other", senderId: "system", timestamp: Date.now() }]);
          setFriendRequestSent(false);
        }
      })
      .subscribe((chStatus, err) => {
        console.log("[TalkingBuddy] Broadcast channel:", chStatus, err ?? "");
        const ready = chStatus === "SUBSCRIBED";
        setChannelReady(ready);
        channelReadyRef.current = ready;
        if (ready && pendingBroadcastsRef.current.length > 0) {
          // Flush messages that were sent before the channel was ready
          console.log(`[TalkingBuddy] Flushing ${pendingBroadcastsRef.current.length} pending broadcast(s)`);
          pendingBroadcastsRef.current.forEach((msg) => chatChannelRef.current?.send(msg));
          pendingBroadcastsRef.current = [];
        }
      });

    // ── Channel B: postgres_changes for messages (SEPARATE — fails gracefully) ─
    // This fires when a message is inserted into the DB, giving near-real-time
    // delivery even if broadcast was missed.
    // Requires: Realtime enabled for `messages` table in Supabase Dashboard →
    //   Database → Replication → tables → toggle messages ON.
    // If this channel fails (RLS or Realtime not enabled), it silently fails
    // WITHOUT affecting Channel A (Broadcast).
    msgChangesRef.current = supabase
      .channel(`buddy_msg_changes:${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${sessionId}` }, (payload) => {
        const m = payload.new as { id: string; chat_id: string; sender_id: string; content: string; is_read: boolean; created_at: string };
        if (m.sender_id === userId) return;
        setOtherUserId((prev) => prev ?? m.sender_id);
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === m.id)) return prev;
          return [...prev, { id: m.id, text: m.content, sender: "other", senderId: m.sender_id, timestamp: new Date(m.created_at).getTime() }];
        });
      })
      .subscribe((chStatus, err) => {
        console.log("[TalkingBuddy] postgres_changes channel:", chStatus, err ?? "");
      });

    // D. Polling fallback (every 2 s) — catches anything missed by Broadcast or postgres_changes.
    // Primary:  getBuddyMessages RPC (SECURITY DEFINER — bypasses RLS entirely)
    //           Requires send_buddy_message + get_buddy_messages from DATABASE_SOURCE_OF_TRUTH.sql
    //           to be run in Supabase SQL Editor.
    // Fallback: direct SELECT from messages (works only if RLS allows it / disabled)
    const msgPollInterval = setInterval(async () => {
      if (!sessionId || !userId) return;
      try {
        // Try SECURITY DEFINER RPC first
        const data = await getBuddyMessages(sessionId, userId);
        if (data && data.length > 0) mergeDbMessages(data);
      } catch {
        // RPC not deployed yet — fall back to direct SELECT
        try {
          const { data: rows } = await supabase
            .from("messages")
            .select("id, sender_id, content, created_at")
            .eq("chat_id", sessionId)
            .order("created_at", { ascending: true });
          if (rows && rows.length > 0) mergeDbMessages(rows as any);
        } catch {
          // Both failed — Realtime broadcast is sole delivery path until SQL is deployed
        }
      }
    }, 2000);

    return () => {
      clearInterval(msgPollInterval);
      setChannelReady(false);
      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
      if (msgChangesRef.current) supabase.removeChannel(msgChangesRef.current);
    };
  }, [userId, status, sessionId]);


  // HELPER: Handle match found — connect immediately, discover partner ID lazily.
  // `resolvedRole` is passed explicitly to avoid stale closure when called from
  // startConnection() where React state (role) hasn't updated yet.
  const handleMatchFound = async (chatId: string, resolvedRole?: UserRole) => {
      const effectiveRole = resolvedRole ?? role;

      // Connect right away so the user isn't stuck on the waiting screen
      setSessionId(chatId);
      setStatus("connected");

      // Cleanup Queue (Best effort - may already be removed by RPC)
      if (userId) {
          try { await cancelMatchmaking(userId); } catch(e) { /* ignore if already gone */ }
      }

      // Try to pre-fetch the OTHER participant's ID.
      // This may fail if Supabase RLS only allows users to see their own row in
      // chat_participants. If it fails, otherUserId will be discovered lazily from
      // the first incoming message (see the message listener below).
      try {
          const { data: participants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chatId)
            .neq('user_id', userId);

          if (participants && participants.length > 0) {
              setOtherUserId(participants[0].user_id);
          }
      } catch (e) {
          console.log("Could not pre-fetch partner ID; will detect from first message.");
      }

      // System Welcome Message — use effectiveRole to avoid stale-closure wrong message
      setMessages([{
        id: `welcome_${Date.now()}`,
        text: effectiveRole === "seeker"
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
            // Pass selectedRole explicitly — React state (role) may not be updated yet
            await handleMatchFound(matchId, selectedRole);
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

  // ACTION: Send Message — broadcast for instant delivery + DB insert for persistence
  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || !userId) return;

    const textToSend = inputMessage;
    setInputMessage("");

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = Date.now();

    // Optimistic UI (show on sender's screen immediately)
    setMessages((prev) => [...prev, {
      id: msgId,
      text: textToSend,
      sender: "me",
      senderId: userId,
      timestamp,
    }]);

    // Broadcast to partner — queue if channel not yet SUBSCRIBED (prevents silent drop)
    const broadcastMsg = { type: "broadcast", event: "new_message", payload: { id: msgId, text: textToSend, senderId: userId, timestamp } };
    if (channelReadyRef.current && chatChannelRef.current) {
      chatChannelRef.current.send(broadcastMsg);
    } else {
      // Channel still subscribing — queue and deliver once SUBSCRIBED
      pendingBroadcastsRef.current.push(broadcastMsg);
    }

    // Persist to DB via SECURITY DEFINER RPC (bypasses RLS).
    // Falls back to direct insert if RPC not deployed yet.
    try {
      await sendBuddyMessageRpc(sessionId, userId, textToSend);
    } catch (rpcErr) {
      console.warn("RPC persist failed, trying direct insert:", rpcErr);
      try {
        await sendBuddyMessage(sessionId, userId, textToSend);
      } catch (directErr) {
        console.error("DB persist failed completely:", directErr);
      }
    }
  };

  // ACTION: Friend/Buddy Requests — broadcast + DB
  const sendFriendReq = async () => {
    if (!userId || !sessionId) return;
    setFriendRequestSent(true);

    // Broadcast the request to partner
    chatChannelRef.current?.send({
      type: "broadcast",
      event: "buddy_request",
      payload: { fromUser: userId },
    });

    // Also persist to DB if we know otherUserId
    if (otherUserId) {
      try {
        await sendBuddyRequest(sessionId, userId, otherUserId);
      } catch (err) {
        console.error("DB buddy_request persist failed");
      }
    }
  };

  const acceptFriendReq = async () => {
    if (!userId || !sessionId) return;

    setFriendsAdded(true);
    setFriendRequestReceived(false);

    // Broadcast acceptance
    chatChannelRef.current?.send({
      type: "broadcast",
      event: "buddy_response",
      payload: { responseStatus: "accepted" },
    });

    // Also update DB if we have the required IDs
    if (otherUserId) {
      try {
        await acceptBuddyRequest(sessionId, userId, otherUserId);
      } catch (err) {
        console.error("DB accept_buddy persist failed");
      }
    }
  };

  const declineFriendReq = async () => {
    if (!userId || !sessionId) return;
    setFriendRequestReceived(false);

    // Broadcast decline
    chatChannelRef.current?.send({
      type: "broadcast",
      event: "buddy_response",
      payload: { responseStatus: "declined" },
    });

    // Also update DB (best effort)
    try {
      await supabase
        .from("buddy_requests")
        .update({ status: "declined" })
        .eq("chat_id", sessionId)
        .eq("to_user", userId);
    } catch (err) {
      console.error("DB decline persist failed");
    }
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