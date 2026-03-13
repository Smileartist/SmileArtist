import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { ChevronLeft, Search, Trash2, Image as ImageIcon } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { useUserData } from "../App";

interface ChatMessage {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    image_url?: string;
}

interface ChatParticipant {
    user_id: string;
}

interface ProfileData {
    id: string;
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
    isAnonymous?: boolean;
    expiresIn?: string;
}

interface ChatsPageProps {
    activeChatId?: string | null;
    onViewChange?: (view: string, id?: string | null) => void;
}

// ── Emoji Grid ──────────────────────────────────────────────────────────
const EMOJI_LIST = [
    "😀", "😂", "🥹", "😍", "🥰", "😘", "😊", "😇",
    "🤗", "🤔", "😏", "😌", "😴", "🥱", "😷", "🤒",
    "😢", "😭", "😤", "🤬", "🤯", "😱", "😳", "🥺",
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
    "🔥", "✨", "💫", "⭐", "🌟", "💯", "🎉", "🎊",
    "👍", "👎", "👋", "🤝", "🙏", "💪", "✌️", "🤞",
    "😈", "👻", "💀", "🤡", "👀", "🫶", "💔", "💕",
    "🌹", "🌸", "🍕", "☕", "🎵", "🎶", "📸", "💬",
];

// ── Image Compression ───────────────────────────────────────────────────
async function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            let w = img.width;
            let h = img.height;
            if (w > maxWidth) {
                h = Math.round((h * maxWidth) / w);
                w = maxWidth;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) { reject(new Error("Canvas not supported")); return; }
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(
                (blob) => { if (blob) resolve(blob); else reject(new Error("Compression failed")); },
                "image/jpeg",
                quality
            );
        };
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = URL.createObjectURL(file);
    });
}

export function ChatsPage({ activeChatId, onViewChange }: ChatsPageProps) {
    const { username, userId } = useUserData();
    const [chats, setChats] = useState<FormattedChat[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);

    const [currentChatId, setCurrentChatId] = useState<string | null>(activeChatId || null);
    const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sending, setSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [contextMenuChat, setContextMenuChat] = useState<{ id: string; x: number; y: number } | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [searchResults, setSearchResults] = useState<ProfileData[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiRef = useRef<HTMLDivElement>(null);
    const searchTimerRef = useRef<any>(null);


    // Close context menu and emoji picker on outside click
    useEffect(() => {
        const handleContext = () => setContextMenuChat(null);
        window.addEventListener("click", handleContext);
        
        const handleEmoji = (e: MouseEvent) => {
            if (showEmojiPicker && emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleEmoji);
        
        return () => {
            window.removeEventListener("click", handleContext);
            document.removeEventListener("mousedown", handleEmoji);
        };
    }, [showEmojiPicker]);

    const getExpiryLabel = (createdAt: string): string => {
        const remaining = new Date(createdAt).getTime() + 86400000 - Date.now();
        if (remaining <= 0) return "Expired";
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
    };

    const fetchChats = useCallback(async (currentUserId: string, isInitial = false, forceChatId?: string) => {
        if (isInitial) setInitialLoading(true);
        try {
            const { data: buddyData } = await supabase
                .from("buddy_requests").select("from_user, to_user")
                .eq("status", "accepted")
                .or(`from_user.eq.${currentUserId},to_user.eq.${currentUserId}`);

            const acceptedBuddyIds = new Set<string>();
            (buddyData || []).forEach((r: any) => {
                const o = r.from_user === currentUserId ? r.to_user : r.from_user;
                if (o) acceptedBuddyIds.add(o);
            });

            const { data, error } = await supabase
                .from("chat_participants")
                .select(`chats (id, created_at, last_message_at, type, status, messages (id, content, created_at, sender_id), chat_participants (user_id))`)
                .eq("user_id", currentUserId);

            if (error) throw error;

            const rawChats = (data || []).map((cp: any) => cp.chats as Chat);
            const now = Date.now();
            const buddyChats: Chat[] = [];
            const anonChats: Chat[] = [];

            // Collect unique chat IDs to prevent raw duplicates
            const seenChatIds = new Set<string>();

            rawChats.forEach(chat => {
                if (!chat || !chat.id || seenChatIds.has(chat.id)) return;
                seenChatIds.add(chat.id);
                if (chat.chat_participants.length <= 1) return;
                const other = chat.chat_participants.find((p: any) => p.user_id !== currentUserId);
                if (!other) return;

                // Always include the forced/active chat (from profile Chat button)
                if (forceChatId && chat.id === forceChatId) {
                    // It could be a buddy chat or a message request chat; let's categorize it correctly
                    if (chat.type === 'message_request' && !acceptedBuddyIds.has(other.user_id)) {
                        anonChats.push(chat);
                        return;
                    }
                    buddyChats.push(chat);
                    return;
                }

                if (chat.type === 'message_request') {
                    if (!acceptedBuddyIds.has(other.user_id)) {
                        anonChats.push(chat);
                    } else {
                        buddyChats.push(chat);
                    }
                } else if (chat.type === 'buddy' && chat.status !== 'temporary') {
                    // Always show permanent buddy chats
                    buddyChats.push(chat);
                } else if (chat.status === 'temporary') {
                    // Handling for anonymous chats
                    const notExpired = new Date(chat.created_at).getTime() > now - 86400000;
                    const isAlreadyBuddy = acceptedBuddyIds.has(other.user_id);
                    if (notExpired && !isAlreadyBuddy) {
                        anonChats.push(chat);
                    } else if (isAlreadyBuddy) {
                        // If they are buddies now, show the old anonymous history in buddy list
                        buddyChats.push(chat);
                    }
                } else if (acceptedBuddyIds.has(other.user_id)) {
                    buddyChats.push(chat);
                }
            });

            const formatChat = async (chat: Chat, isAnon: boolean): Promise<FormattedChat> => {
                const other = chat.chat_participants.find((p: any) => p.user_id !== currentUserId);
                let profile: ProfileData | null = null;
                const isMsgReq = chat.type === 'message_request';

                if (other?.user_id && (!isAnon || isMsgReq)) {
                    const { data: p } = await supabase.from("profiles").select("id, full_name, username, avatar_url").eq("id", other.user_id).single();
                    if (p) profile = p as ProfileData;
                } else if (other?.user_id && isAnon && !isMsgReq) {
                    profile = { id: other.user_id, full_name: "Anonymous User", username: "anonymous", avatar_url: "" };
                }
                const sorted = [...(chat.messages || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                return { ...chat, messages: [], otherParticipant: profile, lastMessage: sorted[0] || null, isAnonymous: isAnon, expiresIn: isAnon ? getExpiryLabel(chat.created_at) : undefined };
            };

            const all = await Promise.all([...buddyChats.map(c => formatChat(c, false)), ...anonChats.map(c => formatChat(c, true))]);

            // Deduplicate by other participant ID — buddy chats take priority over anon chats
            const uniqueMap = new Map<string, FormattedChat>();
            all.forEach(c => {
                if (!c.otherParticipant?.id) return;
                const pid = c.otherParticipant.id;
                const existing = uniqueMap.get(pid);

                if (!existing) { uniqueMap.set(pid, c); return; }

                // Always prioritize the active chat we navigated to
                if (forceChatId && c.id === forceChatId) { uniqueMap.set(pid, c); return; }
                if (forceChatId && existing.id === forceChatId) { return; }

                if (!c.isAnonymous && existing.isAnonymous) { uniqueMap.set(pid, c); return; }
                if (c.isAnonymous && !existing.isAnonymous) return;

                // Prioritize 'buddy' chats over others
                if (c.type === 'buddy' && existing.type !== 'buddy') { uniqueMap.set(pid, c); return; }
                if (c.type !== 'buddy' && existing.type === 'buddy') return;

                // Prioritize 'buddy' chats over others
                if (c.type === 'buddy' && existing.type !== 'buddy') { uniqueMap.set(pid, c); return; }
                if (c.type !== 'buddy' && existing.type === 'buddy') return;

                // Prioritize settled statuses ('permanent', 'active') over 'temporary'
                const isCSettled = c.status === 'permanent' || c.status === 'active';
                const isExSettled = existing.status === 'permanent' || existing.status === 'active';
                if (isCSettled && !isExSettled) { uniqueMap.set(pid, c); return; }
                if (!isCSettled && isExSettled) return;
                
                // Tie breaker 1: Most recent message activity
                const cTime = c.lastMessage ? new Date(c.lastMessage.created_at).getTime() : 0;
                const exTime = existing.lastMessage ? new Date(existing.lastMessage.created_at).getTime() : 0;
                
                if (cTime > exTime) {
                    uniqueMap.set(pid, c);
                    return;
                } else if (cTime < exTime) {
                    return;
                }

                // Tie breaker 2: Number of messages (if timestamps format loses precision or are identical)
                const cCount = c.messages?.length || 0;
                const exCount = existing.messages?.length || 0;
                if (cCount > exCount) {
                    uniqueMap.set(pid, c);
                    return;
                } else if (cCount < exCount) {
                    return;
                }

                // Tie breaker 3: Newest chat structure
                if (new Date(c.created_at).getTime() > new Date(existing.created_at).getTime()) {
                    uniqueMap.set(pid, c);
                }
            });

            const merged = Array.from(uniqueMap.values());
            setChats(merged.sort((a, b) => {
                const da = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.created_at).getTime();
                const db = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.created_at).getTime();
                return db - da;
            }));
        } catch (e) { console.error("Error fetching chats:", e); }
        finally { if (isInitial) setInitialLoading(false); }
    }, []);

    // Sync activeChatId and fetch chats
    useEffect(() => {
        if (activeChatId) {
            setCurrentChatId(activeChatId);
            if (userId) {
                fetchChats(userId, true, activeChatId);
            }
        } else {
            setCurrentChatId(null);
            if (userId) {
                fetchChats(userId, true);
            } else {
                setInitialLoading(false);
            }
        }
    }, [activeChatId, userId, fetchChats]);

    // Fetch messages + realtime
    useEffect(() => {
        if (!currentChatId || !userId) return;
        let mounted = true;
        (async () => {
            const { data } = await supabase.from("messages").select("*").eq("chat_id", currentChatId).order("created_at", { ascending: true });
            if (mounted) { setActiveMessages((data || []) as ChatMessage[]); requestAnimationFrame(scrollToBottom); }
        })();
        const ch = supabase.channel(`chat_${currentChatId}_${Date.now()}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${currentChatId}` }, (p) => {
            if (!mounted) return;
            const m = p.new as ChatMessage;
            setActiveMessages(prev => {
                if (prev.find(x => x.id === m.id)) return prev;
                return [...prev.filter(x => !(x.id.startsWith('optimistic-') && x.sender_id === m.sender_id && x.content === m.content)), m];
            });
            requestAnimationFrame(scrollToBottom);
            fetchChats(userId, false);
        }).subscribe();
        return () => { mounted = false; supabase.removeChannel(ch); };
    }, [currentChatId, userId, fetchChats]);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    const handleSendMessage = async () => {
        const text = newMessage.trim();
        if (!text || !currentChatId || !userId || sending || isSenderBlockedByLimit) return;
        const optId = `optimistic-${Date.now()}-${Math.random()}`;
        setNewMessage(""); setShowEmojiPicker(false); setSending(true);
        setActiveMessages(prev => [...prev, { id: optId, content: text, created_at: new Date().toISOString(), sender_id: userId }]);
        requestAnimationFrame(scrollToBottom);
        try {
            const { error } = await supabase.rpc("send_buddy_message", { p_chat_id: currentChatId, p_user_id: userId, p_content: text });
            if (error) { setActiveMessages(prev => prev.filter(m => m.id !== optId)); }
            else fetchChats(userId, false);
        } catch { setActiveMessages(prev => prev.filter(m => m.id !== optId)); }
        finally { setSending(false); inputRef.current?.focus(); }
    };

    // Image upload handler
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentChatId || !userId || isSenderBlockedByLimit) return;
        e.target.value = ""; // Reset input
        setUploadingImage(true);

        try {
            // Compress the image
            const compressed = await compressImage(file, 800, 0.65);
            const fileName = `${currentChatId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

            // Upload to Supabase storage
            const { error: uploadErr } = await supabase.storage
                .from("chat-images")
                .upload(fileName, compressed, { contentType: "image/jpeg", cacheControl: "3600" });

            if (uploadErr) {
                console.error("Upload error:", uploadErr);
                // Try creating the bucket if it doesn't exist, then retry
                if (uploadErr.message?.includes("not found") || uploadErr.message?.includes("Bucket")) {
                    console.log("Bucket may not exist. Attempting to use avatars bucket as fallback.");
                    const fallbackName = `chat_${currentChatId}_${Date.now()}.jpg`;
                    const { error: fallbackErr } = await supabase.storage
                        .from("avatars")
                        .upload(fallbackName, compressed, { contentType: "image/jpeg", cacheControl: "3600" });
                    if (fallbackErr) throw fallbackErr;
                    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fallbackName);
                    await sendImageMessage(publicUrl);
                } else {
                    throw uploadErr;
                }
            } else {
                const { data: { publicUrl } } = supabase.storage.from("chat-images").getPublicUrl(fileName);
                await sendImageMessage(publicUrl);
            }
        } catch (err) {
            console.error("Image send failed:", err);
        } finally {
            setUploadingImage(false);
        }
    };

    const sendImageMessage = async (imageUrl: string) => {
        if (!currentChatId || !userId) return;
        const optId = `optimistic-img-${Date.now()}`;
        const optMsg: ChatMessage = { id: optId, content: "📷 Photo", created_at: new Date().toISOString(), sender_id: userId, image_url: imageUrl };
        setActiveMessages(prev => [...prev, optMsg]);
        requestAnimationFrame(scrollToBottom);

        try {
            // Send as a message with the image URL in content
            const { error } = await supabase.rpc("send_buddy_message", {
                p_chat_id: currentChatId, p_user_id: userId, p_content: `[img]${imageUrl}[/img]`
            });
            if (error) { setActiveMessages(prev => prev.filter(m => m.id !== optId)); }
            else fetchChats(userId, false);
        } catch { setActiveMessages(prev => prev.filter(m => m.id !== optId)); }
    };

    const handleDeleteChat = async (chatId: string) => {
        try {
            await supabase.from("messages").delete().eq("chat_id", chatId);
            if (userId) await supabase.from("chat_participants").delete().eq("chat_id", chatId).eq("user_id", userId);
            if (currentChatId === chatId) { setCurrentChatId(null); setActiveMessages([]); }
            setChats(prev => prev.filter(c => c.id !== chatId));
            setDeleteConfirmId(null);
        } catch (err) { console.error("Delete error:", err); }
    };

    // Parse image URLs from message content
    const parseMessage = (msg: ChatMessage): { text: string; imageUrl?: string } => {
        if (msg.image_url) return { text: "", imageUrl: msg.image_url };
        const imgMatch = msg.content.match(/\[img\](.*?)\[\/img\]/);
        if (imgMatch) return { text: "", imageUrl: imgMatch[1] };
        return { text: msg.content };
    };

    // Debounced user search (MUST be before any early return)
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        const q = searchQuery.trim();
        if (q.length < 2) { setSearchResults([]); setSearchingUsers(false); return; }
        setSearchingUsers(true);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const { data } = await supabase
                    .from("profiles")
                    .select("id, full_name, username, avatar_url")
                    .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
                    .neq("id", userId || "")
                    .limit(8);
                setSearchResults((data || []) as ProfileData[]);
            } catch { setSearchResults([]); }
            finally { setSearchingUsers(false); }
        }, 300);
        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
    }, [searchQuery, userId]);

    // Open or create chat with a user from search
    const openChatWithUser = async (targetUserId: string) => {
        if (!userId) return;
        setSearchQuery("");
        setSearchResults([]);
        try {
            // First check if they are buddies to decide which RPC to use
            const { data: buddyStatus } = await supabase
                .from('buddy_requests')
                .select('status')
                .eq('status', 'accepted')
                .or(`and(from_user.eq.${userId},to_user.eq.${targetUserId}),and(from_user.eq.${targetUserId},to_user.eq.${userId})`)
                .maybeSingle();

            const isBuddy = !!buddyStatus;
            const rpcName = isBuddy ? "get_or_create_buddy_chat" : "get_or_create_message_request_chat";

            const { data: chatId, error } = await supabase.rpc(rpcName, {
                p_user_id: userId,
                // The param names differ slightly between the two RPCs, let's just pass both to be safe
                // or handle it explicitly based on what we called.
                // p_buddy_id: targetUserId (for get_or_create_buddy_chat)
                // p_target_id: targetUserId (for get_or_create_message_request_chat)
                ...(isBuddy ? { p_buddy_id: targetUserId } : { p_target_id: targetUserId })
            });

            if (error) { console.error("Chat RPC error:", error); return; }
            // Re-fetch all chats through proper dedup/filter pipeline, forcing this chat to be included
            await fetchChats(userId, false, chatId);
            setCurrentChatId(chatId);
        } catch (e) { console.error("Open chat error:", e); }
    };

    if (initialLoading) {
        return (
            <div className="chat-container" style={{ alignItems: 'center', justifyContent: 'center', background: 'var(--theme-background, #000)' }}>
                <p style={{ color: '#888' }}>Loading chats...</p>
            </div>
        );
    }

    const activeChatData = chats.find(c => c.id === currentChatId);
    const filteredChats = searchQuery.trim()
        ? chats.filter(c => {
            const q = searchQuery.toLowerCase();
            if (c.isAnonymous) return "anonymous".includes(q);
            return c.otherParticipant?.full_name?.toLowerCase().includes(q) || c.otherParticipant?.username?.toLowerCase().includes(q);
        })
        : chats;

    // ── Render: Anonymous Avatar helper ──
    const AnonAvatar = ({ size = 56 }: { size?: number }) => (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: size * 0.4, flexShrink: 0,
        }}>👤</div>
    );

    const isMessageRequest = activeChatData?.type === 'message_request';
    const isTemporaryAnon = activeChatData?.isAnonymous && activeChatData?.type !== 'message_request';

    // Calculate message request constraints
    const mySentMessagesCount = activeMessages.filter(m => m.sender_id === userId).length;
    const otherUserMessagesCount = activeMessages.filter(m => m.sender_id !== userId).length;
    const isSenderBlockedByLimit = isMessageRequest && mySentMessagesCount >= 3;
    const isRecipientAccepting = isMessageRequest && otherUserMessagesCount > 0;

    const acceptMessageRequest = async () => {
        if (!activeChatData?.otherParticipant?.id || !userId) return;
        try {
            // Check if request exists
            const { data: existing } = await supabase.from('buddy_requests')
                .select('id').or(`and(from_user.eq.${userId},to_user.eq.${activeChatData.otherParticipant.id}),and(from_user.eq.${activeChatData.otherParticipant.id},to_user.eq.${userId})`)
                .maybeSingle();
            
            if (existing) {
                await supabase.from('buddy_requests').update({ status: 'accepted' }).eq('id', existing.id);
            } else {
                await supabase.from('buddy_requests').insert({
                    from_user: activeChatData.otherParticipant.id,
                    to_user: userId,
                    status: 'accepted'
                });
            }

            // Upgrade chat type to buddy
            await supabase.from('chats').update({ type: 'buddy' }).eq('id', activeChatData.id);
            
            // Refund locally
            setChats(prev => prev.map(c => c.id === activeChatData.id ? { ...c, type: 'buddy' } : c));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="chat-container" style={{ background: 'var(--theme-background, #000)', color: 'var(--theme-text, #fff)' }}>

            {/* ════════ LEFT: Chat List ════════ */}
            <div className={`chat-sidebar ${currentChatId ? 'sidebar-hidden' : ''}`} style={{ background: 'var(--theme-background, #000)', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(128,128,128,0.12)' }}>
                    <h2 style={{ fontWeight: 700, fontSize: '22px' }}>{username || "Messages"}</h2>
                </div>

                {/* Search */}
                <div style={{ padding: '8px 16px', position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', opacity: 0.4 }} />
                        <input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{
                            width: '100%', paddingLeft: '36px', paddingRight: '12px', height: '36px', borderRadius: '10px',
                            border: 'none', background: 'rgba(128,128,128,0.12)', color: 'inherit', fontSize: '14px', outline: 'none',
                        }} />
                    </div>

                    {/* User Search Results Dropdown */}
                    {searchQuery.trim().length >= 2 && (searchResults.length > 0 || searchingUsers) && (
                        <div style={{
                            position: 'absolute', left: '16px', right: '16px', top: '52px', zIndex: 50,
                            background: 'var(--theme-card-bg, #262626)', border: '1px solid rgba(128,128,128,0.15)',
                            borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', maxHeight: '300px', overflowY: 'auto',
                        }}>
                            {searchingUsers ? (
                                <div style={{ padding: '16px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>Searching...</div>
                            ) : (
                                searchResults.map(user => (
                                    <div key={user.id}
                                        onClick={() => openChatWithUser(user.id)}
                                        style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'background 0.1s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(128,128,128,0.08)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Avatar className="w-10 h-10" style={{ flexShrink: 0 }}>
                                            <AvatarImage src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'U')}&background=random`} />
                                            <AvatarFallback>{user.full_name?.[0] || '?'}</AvatarFallback>
                                        </Avatar>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontWeight: 600, fontSize: '14px' }}>{user.full_name || user.username}</p>
                                            <p style={{ fontSize: '12px', opacity: 0.5 }}>@{user.username}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Chat Items */}
                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
                    {filteredChats.length > 0 ? filteredChats.map(chat => {
                        const isActive = chat.id === currentChatId;
                        const lastContent = chat.lastMessage?.content?.match(/\[img\]/) ? "📷 Photo" : chat.lastMessage?.content;
                        return (
                            <div key={chat.id}
                                onClick={() => setCurrentChatId(chat.id)}
                                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenuChat({ id: chat.id, x: e.clientX, y: e.clientY }); }}
                                style={{
                                    padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
                                    background: isActive ? 'rgba(128,128,128,0.1)' : 'transparent', transition: 'background 0.1s',
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(128,128,128,0.05)'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                            >
                                {chat.isAnonymous && chat.type !== 'message_request' ? <AnonAvatar size={56} /> : (
                                    <Avatar className="w-14 h-14" style={{ flexShrink: 0 }}>
                                        <AvatarImage src={chat.otherParticipant?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.otherParticipant?.full_name || 'U')}&background=random`} />
                                        <AvatarFallback>{chat.otherParticipant?.full_name?.[0] || '?'}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {chat.isAnonymous && chat.type !== 'message_request' ? "Anonymous Chat" : (chat.otherParticipant?.full_name || chat.otherParticipant?.username || 'Unknown')}
                                        </span>
                                        {chat.isAnonymous && chat.type !== 'message_request' && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: 'rgba(118,75,162,0.2)', color: '#9b7bd4', whiteSpace: 'nowrap' }}>{chat.expiresIn}</span>}
                                        {chat.type === 'message_request' && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: 'rgba(55,151,240,0.1)', color: '#3797F0', whiteSpace: 'nowrap' }}>Request</span>}
                                    </div>
                                    <div style={{ display: 'flex', fontSize: '13px', opacity: 0.5, marginTop: '2px' }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                            {chat.lastMessage?.sender_id === userId && "You: "}{lastContent || "No messages yet."}
                                        </span>
                                        {chat.lastMessage && <span style={{ flexShrink: 0, marginLeft: '4px' }}>· {new Date(chat.lastMessage.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div style={{ textAlign: 'center', padding: '48px 20px', opacity: 0.4 }}>
                            <p>{searchQuery ? "No matches" : "No messages yet"}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Menu */}
            {contextMenuChat && (
                <div onClick={e => e.stopPropagation()} style={{
                    position: 'fixed', left: contextMenuChat.x, top: contextMenuChat.y, zIndex: 9999,
                    background: 'var(--theme-card-bg, #262626)', border: '1px solid rgba(128,128,128,0.2)',
                    borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: '4px', minWidth: '160px',
                }}>
                    <button onClick={() => { setDeleteConfirmId(contextMenuChat.id); setContextMenuChat(null); }} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px',
                        border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '8px',
                        color: '#ed4956', fontSize: '14px', fontWeight: 600,
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(237,73,86,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <Trash2 style={{ width: '16px', height: '16px' }} /> Delete chat
                    </button>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirmId && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }} onClick={() => setDeleteConfirmId(null)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--theme-card-bg, #262626)', color: 'inherit', borderRadius: '16px',
                        padding: '28px', maxWidth: '340px', width: '90%', textAlign: 'center',
                    }}>
                        <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Delete Chat?</h3>
                        <p style={{ opacity: 0.5, fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>This will permanently delete all messages. This can't be undone.</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '10px 24px', borderRadius: '10px', border: '1px solid rgba(128,128,128,0.3)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '14px', color: 'inherit' }}>Cancel</button>
                            <button onClick={() => handleDeleteChat(deleteConfirmId)} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#ed4956', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Overlay */}
            {previewImage && (
                <div className="chat-img-overlay" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} alt="Preview" />
                </div>
            )}

            {/* ════════ RIGHT: Active Chat ════════ */}
            <div className={`chat-main ${!currentChatId ? 'main-hidden' : ''}`} style={{ background: 'var(--theme-background, #000)', display: 'flex', flexDirection: 'column' }}>
                {currentChatId && activeChatData ? (
                    <>
                        {/* ── Header ── */}
                        <div style={{
                            padding: '10px 12px', borderBottom: '1px solid rgba(128,128,128,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                            background: 'var(--theme-background, #000)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button className="chat-back-btn" onClick={() => { setCurrentChatId(null); onViewChange?.('chats', null); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'inherit', display: 'flex', alignItems: 'center' }}>
                                    <ChevronLeft style={{ width: '28px', height: '28px' }} />
                                </button>
                                {isTemporaryAnon ? <AnonAvatar size={32} /> : (
                                    <Avatar className="w-8 h-8" style={{ cursor: 'pointer' }} onClick={() => onViewChange?.('profile', activeChatData?.otherParticipant?.username || null)}>
                                        <AvatarImage src={activeChatData?.otherParticipant?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatData?.otherParticipant?.full_name || 'U')}&background=random`} />
                                        <AvatarFallback>{activeChatData?.otherParticipant?.full_name?.[0] || '?'}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: '15px', cursor: isTemporaryAnon ? 'default' : 'pointer' }}
                                        onClick={() => !isTemporaryAnon && activeChatData?.otherParticipant?.username && onViewChange?.('profile', activeChatData.otherParticipant.username)}>
                                        {isTemporaryAnon ? "Anonymous Chat" : (activeChatData?.otherParticipant?.full_name || activeChatData?.otherParticipant?.username || 'Chat')}
                                    </span>
                                    {isTemporaryAnon && <p style={{ fontSize: '11px', opacity: 0.4 }}>{activeChatData?.expiresIn}</p>}
                                    {isMessageRequest && <p style={{ fontSize: '11px', color: '#3797f0' }}>Message Request</p>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {isRecipientAccepting && (
                                    <button onClick={acceptMessageRequest} style={{ background: '#3797f0', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                                        Accept Request
                                    </button>
                                )}
                                <button onClick={() => setDeleteConfirmId(currentChatId)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', opacity: 0.4, color: 'inherit' }} title="Delete">
                                    <Trash2 style={{ width: '20px', height: '20px' }} />
                                </button>
                            </div>
                        </div>

                        {/* ── Messages ── */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
                            {/* Profile intro */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '24px', paddingBottom: '40px' }}>
                                {isTemporaryAnon ? <AnonAvatar size={80} /> : (
                                    <Avatar className="w-20 h-20" style={{ marginBottom: '8px' }}>
                                        <AvatarImage src={activeChatData.otherParticipant?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatData.otherParticipant?.full_name || 'U')}&background=random`} />
                                        <AvatarFallback style={{ fontSize: '24px' }}>{activeChatData.otherParticipant?.full_name?.[0] || '?'}</AvatarFallback>
                                    </Avatar>
                                )}
                                <h3 style={{ fontWeight: 700, fontSize: '18px', marginTop: '8px' }}>
                                    {isTemporaryAnon ? "Anonymous Chat" : (activeChatData.otherParticipant?.full_name || activeChatData.otherParticipant?.username)}
                                </h3>
                                <p style={{ opacity: 0.4, fontSize: '13px', marginTop: '2px' }}>
                                    {isTemporaryAnon ? `Talking Buddy · ${activeChatData.expiresIn}` : "Smile Artist Buddy"}
                                </p>
                                {!isTemporaryAnon && (
                                    <button onClick={() => onViewChange?.('profile', activeChatData.otherParticipant?.username || null)}
                                        style={{ marginTop: '12px', padding: '6px 16px', borderRadius: '10px', border: 'none', background: 'rgba(128,128,128,0.15)', color: 'inherit', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                                        View profile
                                    </button>
                                )}
                                {isMessageRequest && (
                                    <div style={{ marginTop: '24px', padding: '12px 16px', background: 'rgba(55,151,240,0.1)', borderRadius: '12px', border: '1px solid rgba(55,151,240,0.2)' }}>
                                        <p style={{ color: '#3797f0', fontSize: '13px', textAlign: 'center' }}>
                                            This is a message request. You can send up to 3 messages before they accept.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Bubbles */}
                            {activeMessages.map((msg, i) => {
                                const isMe = msg.sender_id === userId;
                                const prev = i > 0 ? activeMessages[i - 1] : null;
                                const consecutive = prev?.sender_id === msg.sender_id;
                                const parsed = parseMessage(msg);

                                return (
                                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: consecutive ? '2px' : '12px' }}>
                                        {!isMe && !consecutive && (
                                            isTemporaryAnon
                                                ? <AnonAvatar size={28} />
                                                : <Avatar className="w-7 h-7" style={{ marginRight: '8px', alignSelf: 'flex-end', marginBottom: '2px', flexShrink: 0 }}>
                                                    <AvatarImage src={activeChatData.otherParticipant?.avatar_url || ''} />
                                                    <AvatarFallback style={{ fontSize: '10px' }}>{activeChatData.otherParticipant?.full_name?.[0] || 'U'}</AvatarFallback>
                                                </Avatar>
                                        )}
                                        {!isMe && consecutive && <div style={{ width: '36px', flexShrink: 0 }} />}

                                        {parsed.imageUrl ? (
                                            <img
                                                src={parsed.imageUrl} alt="Shared"
                                                className="chat-img-message"
                                                onClick={() => setPreviewImage(parsed.imageUrl!)}
                                                style={{ opacity: msg.id.startsWith('optimistic-') ? 0.6 : 1 }}
                                            />
                                        ) : (
                                            <div style={{
                                                maxWidth: '70%', padding: '8px 14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                                fontSize: '15px', lineHeight: 1.4,
                                                background: isMe ? '#3797F0' : 'rgba(128,128,128,0.15)',
                                                color: isMe ? '#fff' : 'inherit',
                                                borderRadius: isMe
                                                    ? `18px ${!consecutive ? '18px' : '4px'} 4px 18px`
                                                    : `${!consecutive ? '18px' : '4px'} 18px 18px 4px`,
                                                opacity: msg.id.startsWith('optimistic-') ? 0.6 : 1,
                                            }}>
                                                {parsed.text}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} style={{ paddingBottom: '4px' }} />
                        </div>

                        {/* ── Input Area ── */}
                        <div style={{ padding: '8px 12px', flexShrink: 0, borderTop: '1px solid rgba(128,128,128,0.1)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))', position: 'relative' }}>
                            {/* Emoji Picker */}
                            {showEmojiPicker && (
                                <div ref={emojiRef} style={{
                                    position: 'absolute', bottom: '56px', left: '8px', right: '8px', maxWidth: '340px',
                                    background: 'var(--theme-card-bg, #262626)', border: '1px solid rgba(128,128,128,0.15)',
                                    borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', padding: '10px', zIndex: 100,
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px' }}>
                                        {EMOJI_LIST.map(em => (
                                            <button key={em} onClick={() => { setNewMessage(p => p + em); inputRef.current?.focus(); }}
                                                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '5px', borderRadius: '6px', lineHeight: 1 }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(128,128,128,0.12)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                                {em}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(128,128,128,0.2)', borderRadius: '22px', padding: '2px 6px', background: 'rgba(128,128,128,0.06)' }}>
                                {/* Emoji toggle */}
                                <button onClick={() => !isSenderBlockedByLimit && setShowEmojiPicker(p => !p)} disabled={isSenderBlockedByLimit} style={{ padding: '8px', cursor: isSenderBlockedByLimit ? 'not-allowed' : 'pointer', opacity: showEmojiPicker ? 1 : (isSenderBlockedByLimit ? 0.3 : 0.5), flexShrink: 0, background: 'none', border: 'none', color: 'inherit' }}>
                                    <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M15.83 10.997a1.167 1.167 0 1 0 1.167 1.167 1.167 1.167 0 0 0-1.167-1.167Zm-6.5 1.167a1.167 1.167 0 1 0-1.166 1.167 1.167 1.167 0 0 0 1.166-1.167Zm5.163 3.24a3.406 3.406 0 0 1-4.982.007 1 1 0 1 0-1.557 1.256 5.397 5.397 0 0 0 8.09-.036 1 1 0 0 0-1.55-1.227ZM12 2.002a10.001 10.001 0 1 0 10 10 10.011 10.011 0 0 0-10-10Zm0 18a8 8 0 1 1 8-8 8.01 8.01 0 0 1-8 8Z"></path></svg>
                                </button>

                                {/* Text input */}
                                <input ref={inputRef} value={newMessage} onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    disabled={isSenderBlockedByLimit}
                                    placeholder={isSenderBlockedByLimit ? "Message limit reached..." : "Message..."} 
                                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', padding: '6px 8px', color: 'inherit', opacity: isSenderBlockedByLimit ? 0.5 : 1 }} />

                                {/* Image upload */}
                                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                                {!newMessage.trim() && (
                                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage || isSenderBlockedByLimit}
                                        style={{ padding: '8px', cursor: uploadingImage || isSenderBlockedByLimit ? 'wait' : 'pointer', opacity: uploadingImage || isSenderBlockedByLimit ? 0.3 : 0.5, flexShrink: 0, background: 'none', border: 'none', color: 'inherit' }}>
                                        <ImageIcon style={{ width: '22px', height: '22px' }} />
                                    </button>
                                )}

                                {/* Send button */}
                                {newMessage.trim() && (
                                    <button onClick={handleSendMessage} disabled={sending || isSenderBlockedByLimit}
                                        style={{ background: 'none', border: 'none', color: '#3797F0', fontWeight: 700, fontSize: '14px', cursor: sending || isSenderBlockedByLimit ? 'default' : 'pointer', padding: '4px 12px', opacity: sending || isSenderBlockedByLimit ? 0.5 : 1 }}>
                                        Send
                                    </button>
                                )}
                            </div>
                            
                            {isSenderBlockedByLimit && (
                                <div style={{ 
                                    position: 'absolute', inset: 0, background: 'var(--theme-card-bg)', zIndex: 110,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9,
                                    borderTop: '1px solid rgba(128,128,128,0.1)'
                                }}>
                                    <p style={{ fontSize: '13px', color: '#ed4956', fontWeight: 600, padding: '0 16px', textAlign: 'center' }}>
                                        You have sent 3 messages. Wait for them to accept.
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Empty State */
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
                        <div style={{ width: '96px', height: '96px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '2px solid currentColor' }}>
                            <svg fill="none" height="48" viewBox="0 0 96 96" width="48"><path d="M48 0C21.532 0 0 21.533 0 48s21.532 48 48 48 48-21.532 48-48S74.468 0 48 0Zm0 94C22.636 94 2 73.364 2 48S22.636 2 48 2s46 20.636 46 46-20.636 46-46 46Zm12.227-53.284-7.257 5.507c-.49.37-1.166.375-1.661.005l-5.373-4.031a3.453 3.453 0 0 0-4.989.921l-6.756 10.718c-.653 1.027.615 2.189 1.582 1.453l7.257-5.507a1.382 1.382 0 0 1 1.661-.005l5.373 4.031a3.453 3.453 0 0 0 4.989-.92l6.756-10.719c.653-1.027-.615-2.189-1.582-1.453ZM48 25c-12.958 0-23 9.492-23 22.31 0 6.706 2.749 12.5 7.224 16.503.375.338.602.806.62 1.31l.125 4.091a1.845 1.845 0 0 0 2.582 1.629l4.563-2.013a1.844 1.844 0 0 1 1.227-.093c2.096.579 4.331.884 6.659.884 12.958 0 23-9.491 23-22.31S60.958 25 48 25Zm0 42.621c-2.114 0-4.175-.273-6.133-.813a3.834 3.834 0 0 0-2.56.192l-4.346 1.917-.118-3.867a3.833 3.833 0 0 0-1.286-2.727C29.33 58.54 27 53.209 27 47.31 27 35.73 36.566 27 48 27s21 8.73 21 20.31-9.434 20.31-21 20.31Z" fill="currentColor"></path></svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '8px' }}>Your messages</h2>
                        <p style={{ opacity: 0.4, fontSize: '14px', marginBottom: '24px' }}>Send private photos and messages to a friend or group.</p>
                        <Button style={{ background: '#0095f6', color: '#fff', borderRadius: '10px', fontWeight: 600, padding: '6px 16px' }} onClick={() => onViewChange?.('search')}>Send message</Button>
                    </div>
                )}
            </div>

            {/* Hidden file input */}
        </div>
    );
}
